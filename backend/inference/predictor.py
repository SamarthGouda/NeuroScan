"""
Main inference predictor — orchestrates the full pipeline for a single image.
"""
import json
import time
import base64
import uuid
from pathlib import Path
from io import BytesIO
from typing import Optional

import numpy as np
import torch
import torchvision.transforms as T
from PIL import Image

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import (
    CLASS_NAMES, CLASS_DISPLAY, IMG_SIZE,
    IMAGENET_MEAN, IMAGENET_STD, MODEL_SAVE_PATH,
)
from models.hybrid_classifier import (
    HybridClassifier, CNNOnlyClassifier, ViTOnlyClassifier,
    SimpleConcatClassifier, enable_dropout,
)
from models.attention_unet import AttentionUNet
from inference.uncertainty import MCDropoutPredictor
from inference.risk_stratifier import compute_risk_score
from xai.xai_engine import XAIEngine
from xai.xai_evaluator import XAIEvaluator
from radiomics.radiomics_extractor import RadiomicsExtractor
from report.report_generator import generate_clinical_report

# Model variant registry
_MODEL_REGISTRY = {
    "resnet50_only":  CNNOnlyClassifier,
    "swin_only":      ViTOnlyClassifier,
    "concat_no_attn": SimpleConcatClassifier,
    "hybrid":         HybridClassifier,
}


def _pick_best_model():
    """
    Read ablation_summary.json and return (variant_name, model_class, ckpt_path).
    Falls back to hybrid if no summary exists.
    """
    summary_path = MODEL_SAVE_PATH / "ablation_summary.json"
    if summary_path.exists():
        with open(summary_path) as f:
            summary = json.load(f)
        best = summary.get("best_model", "hybrid")
        # Verify checkpoint exists
        ckpt = MODEL_SAVE_PATH / f"{best}_best.pth"
        if ckpt.exists() and best in _MODEL_REGISTRY:
            return best, _MODEL_REGISTRY[best], ckpt
    # Fallback order
    for name in ("concat_no_attn", "hybrid", "resnet50_only"):
        ckpt = MODEL_SAVE_PATH / f"{name}_best.pth"
        if ckpt.exists():
            return name, _MODEL_REGISTRY[name], ckpt
    return "hybrid", HybridClassifier, MODEL_SAVE_PATH / "hybrid_best.pth"



# ─── Image Preprocessing ─────────────────────────────────────────────────────

TRANSFORM = T.Compose([
    T.Resize((IMG_SIZE, IMG_SIZE)),
    T.ToTensor(),
    T.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
])


def load_image_tensor(image: Image.Image) -> torch.Tensor:
    """Convert PIL image to normalised tensor of shape (1, 3, H, W)."""
    if image.mode != "RGB":
        image = image.convert("RGB")
    tensor = TRANSFORM(image).unsqueeze(0)
    return tensor


def pil_to_base64(image: Image.Image, fmt: str = "PNG") -> str:
    buf = BytesIO()
    image.save(buf, format=fmt)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


# ─── Predictor ────────────────────────────────────────────────────────────────

class NeuroVisionPredictor:
    """
    Loads all models once and exposes predict() for API use.
    """

    def __init__(self, device: Optional[torch.device] = None):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[Predictor] Using device: {self.device}")

        # ── Classifier — auto-pick best model from ablation summary ────────
        variant_name, model_cls, clf_ckpt = _pick_best_model()
        self.classifier = model_cls(num_classes=len(CLASS_NAMES), pretrained=False)
        self.model_variant = variant_name
        if clf_ckpt.exists():
            state = torch.load(clf_ckpt, map_location=self.device, weights_only=False)
            if isinstance(state, dict) and "model_state_dict" in state:
                state = state["model_state_dict"]
            self.classifier.load_state_dict(state, strict=False)
            print(f"[Predictor] Loaded best classifier: {variant_name} from {clf_ckpt.name}")
        else:
            print(f"[Predictor] WARNING: No checkpoint found at {clf_ckpt}. Using random weights.")
        self.classifier.to(self.device)
        self.classifier.eval()

        # ── Segmentation U-Net ───────────────────────────────────────────────
        self.unet = AttentionUNet(in_channels=3, out_channels=1, pretrained=False)
        seg_ckpt = MODEL_SAVE_PATH / "attention_unet_best.pth"
        if seg_ckpt.exists():
            state = torch.load(seg_ckpt, map_location=self.device, weights_only=False)
            if isinstance(state, dict) and "model_state_dict" in state:
                state = state["model_state_dict"]
            self.unet.load_state_dict(state, strict=False)
            print(f"[Predictor] Loaded U-Net from {seg_ckpt}")
        else:
            print(f"[Predictor] WARNING: No U-Net checkpoint found at {seg_ckpt}. Using random weights.")
        self.unet.to(self.device)
        self.unet.eval()

        # ── Sub-modules ──────────────────────────────────────────────────────
        self.mc_predictor   = MCDropoutPredictor(self.classifier, self.device)
        self.xai_engine     = XAIEngine(self.classifier, self.device)
        self.xai_evaluator  = XAIEvaluator()
        self.radiomics_ext  = RadiomicsExtractor()

    # ─────────────────────────────────────────────────────────────────────────

    def predict(self, image: Image.Image, filename: str = "upload.jpg") -> dict:
        """
        Full inference pipeline.
        Returns complete JSON-serialisable result dict.
        """
        t_start = time.time()
        timings = {}

        if image.mode != "RGB":
            image = image.convert("RGB")

        original_size = image.size   # (W, H)
        image_resized = image.resize((IMG_SIZE, IMG_SIZE))
        img_tensor = load_image_tensor(image)   # (1, 3, 224, 224)

        # 1. MC-Dropout prediction + uncertainty ─────────────────────────────
        t0 = time.time()
        pred = self.mc_predictor.predict_with_uncertainty(img_tensor)
        timings["uncertainty_ms"] = int((time.time() - t0) * 1000)

        tumor_class = pred["predicted_class"]
        is_tumor    = tumor_class != "notumor"

        # 2. XAI heatmaps ────────────────────────────────────────────────────
        t0 = time.time()
        xai_results = self.xai_engine.generate_all(img_tensor, image_resized, pred)
        timings["xai_ms"] = int((time.time() - t0) * 1000)

        # 3. Segmentation ────────────────────────────────────────────────────
        t0 = time.time()
        seg_result = self._run_segmentation(img_tensor, image_resized, is_tumor)
        timings["segmentation_ms"] = int((time.time() - t0) * 1000)

        # 4. Radiomics ───────────────────────────────────────────────────────
        t0 = time.time()
        radiomics_result = self._run_radiomics(image_resized, seg_result["mask_np"])
        timings["radiomics_ms"] = int((time.time() - t0) * 1000)

        # 5. Risk score ──────────────────────────────────────────────────────
        risk = compute_risk_score(pred, seg_result["tumor_area_pixels"], IMG_SIZE)

        # 6. XAI faithfulness ────────────────────────────────────────────────
        faithfulness = self.xai_evaluator.evaluate(
            xai_results.get("gradcam_raw"),
            xai_results.get("gradcam_plus_raw"),
            seg_result["mask_np"],
        )

        # 7. Clinical report ─────────────────────────────────────────────────
        t0 = time.time()
        report_data = {
            "tumor_type":            CLASS_DISPLAY.get(tumor_class, tumor_class),
            "tumor_class_raw":       tumor_class,
            "confidence":            pred["confidence"],
            "uncertainty":           pred["uncertainty"],
            "uncertainty_tier":      pred["uncertainty_tier"],
            "clinical_flag":         pred["clinical_flag"],
            "entropy":               pred["entropy"],
            "risk_level":            risk["level"],
            "risk_score":            risk["score"],
            "risk_recommendation":   risk["recommendation"],
            "followup":              risk["followup"],
            "top_radiomics_features": radiomics_result.get("features", []),
            "segmentation_area_pixels": seg_result["tumor_area_pixels"],
            "segmentation_area_percent": seg_result["tumor_area_percent"],
            "xai_methods_used":      list(xai_results.get("available_methods", [])),
        }
        clinical_report = generate_clinical_report(report_data)
        timings["report_ms"] = int((time.time() - t0) * 1000)

        # 8. Build response ───────────────────────────────────────────────────
        import json
        prediction_id = str(uuid.uuid4())
        total_ms = int((time.time() - t_start) * 1000)

        # Probability dicts
        class_probs = {
            CLASS_NAMES[i]: pred["mean_probabilities"][i]
            for i in range(len(CLASS_NAMES))
        }
        std_probs = {
            CLASS_NAMES[i]: pred["std_probabilities"][i]
            for i in range(len(CLASS_NAMES))
        }

        result = {
            # ── Flat fields expected by React frontend ────────────────────────
            "prediction_id":            prediction_id,
            "timestamp":                __import__("datetime").datetime.utcnow().isoformat() + "Z",

            # Classification
            "tumor_class_raw":          tumor_class,
            "tumor_type":               CLASS_DISPLAY.get(tumor_class, tumor_class),
            "confidence":               pred["confidence"],
            "uncertainty":              pred["uncertainty"],
            "uncertainty_tier":         pred["uncertainty_tier"],
            "clinical_flag":            pred["clinical_flag"],
            "entropy":                  pred["entropy"],
            "class_probabilities":      class_probs,
            "std_probabilities":        std_probs,

            # Risk
            "risk_level":               risk["level"],
            "risk_score":               risk["score"],
            "risk_recommendation":      risk["recommendation"],

            # XAI
            "xai": {
                "gradcam":              xai_results.get("gradcam"),
                "gradcam_plus":         xai_results.get("gradcam_plus"),
                "scorecam":             xai_results.get("scorecam"),
                "integrated_gradients": xai_results.get("integrated_gradients"),
                "faithfulness":         faithfulness,
            },

            # Segmentation
            "segmentation": {
                "mask_overlay":         seg_result["mask_overlay_b64"],
                "tumor_area_pixels":    seg_result["tumor_area_pixels"],
                "tumor_area_percent":   seg_result["tumor_area_percent"],
            },

            # Radiomics
            "top_radiomics_features":   radiomics_result.get("features", []),

            # Clinical report
            "clinical_report":          clinical_report,

            # Timings
            "processing_breakdown":     {
                "Classification":  timings.get("uncertainty_ms", 0),
                "XAI Heatmaps":    timings.get("xai_ms", 0),
                "Segmentation":    timings.get("segmentation_ms", 0),
                "Radiomics":       timings.get("radiomics_ms", 0),
                "Report":          timings.get("report_ms", 0),
            },
            "processing_time_ms":       total_ms,
            "model_variant":            self.model_variant,

            # ── DB payload (stripped by route before returning) ───────────────
            "_db_payload": {
                "id":                   prediction_id,
                "image_filename":       filename,
                "predicted_class":      tumor_class,
                "confidence":           pred["confidence"],
                "uncertainty":          pred["uncertainty"],
                "uncertainty_tier":     pred["uncertainty_tier"],
                "risk_level":           risk["level"],
                "risk_score":           risk["score"],
                "entropy":              pred["entropy"],
                "class_probabilities":  json.dumps(class_probs),
                "std_probabilities":    json.dumps(std_probs),
                "radiomics_features":   json.dumps(radiomics_result.get("features", [])),
                "clinical_report":      clinical_report,
                "processing_time_ms":   total_ms,
            },
        }
        return result

    # ─────────────────────────────────────────────────────────────────────────

    def _run_segmentation(self, img_tensor: torch.Tensor, image_pil: Image.Image, is_tumor: bool) -> dict:
        import cv2
        import numpy as np

        if not is_tumor:
            # Return blank overlay
            blank = np.array(image_pil)
            blank_b64 = pil_to_base64(image_pil)
            return {
                "mask_overlay_b64":  blank_b64,
                "tumor_area_pixels": 0,
                "tumor_area_percent": 0.0,
                "mask_np":           np.zeros((IMG_SIZE, IMG_SIZE), dtype=np.float32),
            }

        with torch.no_grad():
            mask = self.unet(img_tensor.to(self.device))   # (1, 1, H, W)
            mask = mask.squeeze().cpu().numpy()             # (H, W) in [0,1]

        # Threshold
        binary_mask = (mask > 0.5).astype(np.uint8)
        tumor_area  = int(binary_mask.sum())
        tumor_pct   = round(tumor_area / (IMG_SIZE * IMG_SIZE) * 100, 2)

        # Overlay
        img_np = np.array(image_pil.resize((IMG_SIZE, IMG_SIZE)))
        mask_resized = cv2.resize(mask, (IMG_SIZE, IMG_SIZE))
        heatmap = cv2.applyColorMap(
            (mask_resized * 255).astype(np.uint8), cv2.COLORMAP_HOT
        )
        heatmap_rgb = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
        overlay = (0.6 * img_np + 0.4 * heatmap_rgb).clip(0, 255).astype(np.uint8)
        overlay_pil = Image.fromarray(overlay)

        return {
            "mask_overlay_b64":  pil_to_base64(overlay_pil),
            "tumor_area_pixels": tumor_area,
            "tumor_area_percent": tumor_pct,
            "mask_np":           mask,
        }

    def _run_radiomics(self, image_pil: Image.Image, mask_np: np.ndarray) -> dict:
        try:
            return self.radiomics_ext.extract(image_pil, mask_np)
        except Exception as e:
            print(f"[Predictor] Radiomics failed: {e}")
            return {"features": []}
