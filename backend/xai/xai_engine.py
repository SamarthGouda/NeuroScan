"""
XAI Engine — generates all 4 explainability heatmaps as base64 PNG overlays.

Methods:
  1. Grad-CAM              (pytorch_grad_cam)
  2. Grad-CAM++            (pytorch_grad_cam)
  3. Score-CAM             (pytorch_grad_cam)
  4. Integrated Gradients  (captum)
"""
import base64
import numpy as np
import cv2
import torch
import torch.nn.functional as F
from io import BytesIO
from PIL import Image
from typing import Optional, Dict, Any

# pytorch-grad-cam
from pytorch_grad_cam import GradCAM, GradCAMPlusPlus, ScoreCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pytorch_grad_cam.utils.image import show_cam_on_image

# captum
from captum.attr import IntegratedGradients

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import CLASS_NAMES, IMG_SIZE, IMAGENET_MEAN, IMAGENET_STD


# ─── Helpers ─────────────────────────────────────────────────────────────────

def tensor_to_rgb(img_tensor: torch.Tensor) -> np.ndarray:
    """Denormalise and convert (1, C, H, W) tensor → uint8 HWC numpy array."""
    mean = np.array(IMAGENET_MEAN)
    std  = np.array(IMAGENET_STD)
    img  = img_tensor.squeeze().cpu().numpy().transpose(1, 2, 0)
    img  = (img * std + mean).clip(0, 1)
    return (img * 255).astype(np.uint8)


def numpy_to_b64(img_np: np.ndarray) -> str:
    pil = Image.fromarray(img_np)
    buf = BytesIO()
    pil.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def overlay_heatmap(rgb_np: np.ndarray, cam: np.ndarray, alpha: float = 0.4) -> np.ndarray:
    """Blend Grad-CAM heatmap onto original image."""
    cam_uint8 = (cam * 255).astype(np.uint8)
    heatmap   = cv2.applyColorMap(cam_uint8, cv2.COLORMAP_JET)
    heatmap   = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
    blended   = (alpha * heatmap + (1 - alpha) * rgb_np).clip(0, 255).astype(np.uint8)
    return blended


# ─── Main Engine ─────────────────────────────────────────────────────────────

class XAIEngine:
    def __init__(self, model: torch.nn.Module, device: torch.device):
        self.model  = model
        self.device = device

        # Target layer for CAM methods: last conv block of ResNet50 branch
        # This accesses the final BasicBlock / Bottleneck in layer4
        self._target_layers = self._resolve_target_layers()

    def _resolve_target_layers(self):
        """Resolve the correct target layer from the model."""
        # Works for HybridClassifier, CNNOnlyClassifier, SimpleConcatClassifier
        for attr in ("gradcam_target_layer",):
            if hasattr(self.model, attr):
                return [getattr(self.model, attr)]

        # Fallback: walk model looking for last Conv2d in layer4-like attr
        for name, module in self.model.named_modules():
            pass  # exhaust iterator to get last module
        # If nothing found, return model itself (will be caught as error)
        return [module]

    # ─────────────────────────────────────────────────────────────────────────

    def _run_gradcam(self, img_tensor: torch.Tensor, target_class: int, rgb_np: np.ndarray):
        try:
            cam = GradCAM(model=self.model, target_layers=self._target_layers)
            targets = [ClassifierOutputTarget(target_class)]
            grayscale_cam = cam(input_tensor=img_tensor, targets=targets)[0]
            overlay = overlay_heatmap(rgb_np, grayscale_cam)
            return numpy_to_b64(overlay), grayscale_cam
        except Exception as e:
            print(f"[XAI] GradCAM failed: {e}")
            return None, None

    def _run_gradcam_plus(self, img_tensor: torch.Tensor, target_class: int, rgb_np: np.ndarray):
        try:
            cam = GradCAMPlusPlus(model=self.model, target_layers=self._target_layers)
            targets = [ClassifierOutputTarget(target_class)]
            grayscale_cam = cam(input_tensor=img_tensor, targets=targets)[0]
            overlay = overlay_heatmap(rgb_np, grayscale_cam)
            return numpy_to_b64(overlay), grayscale_cam
        except Exception as e:
            print(f"[XAI] GradCAM++ failed: {e}")
            return None, None

    def _run_scorecam(self, img_tensor: torch.Tensor, target_class: int, rgb_np: np.ndarray):
        try:
            cam = ScoreCAM(model=self.model, target_layers=self._target_layers)
            targets = [ClassifierOutputTarget(target_class)]
            grayscale_cam = cam(input_tensor=img_tensor, targets=targets)[0]
            overlay = overlay_heatmap(rgb_np, grayscale_cam)
            return numpy_to_b64(overlay), grayscale_cam
        except Exception as e:
            print(f"[XAI] ScoreCAM failed: {e}")
            return None, None

    def _run_integrated_gradients(
        self, img_tensor: torch.Tensor, target_class: int, rgb_np: np.ndarray
    ):
        try:
            ig   = IntegratedGradients(self.model)
            inp  = img_tensor.to(self.device).requires_grad_(True)
            # Gaussian noise baseline as recommended for medical images
            baseline = torch.randn_like(inp) * 0.01

            attributions = ig.attribute(
                inp,
                baselines=baseline,
                target=target_class,
                n_steps=10,
                internal_batch_size=4,
            )
            # Aggregate over channels → absolute importance map
            attr_map = attributions.squeeze().cpu().detach().numpy()  # (C, H, W)
            attr_map = np.abs(attr_map).mean(axis=0)                  # (H, W)
            attr_map = (attr_map - attr_map.min()) / (attr_map.max() - attr_map.min() + 1e-8)

            # Apply HOT colormap
            attr_uint8 = (attr_map * 255).astype(np.uint8)
            heatmap    = cv2.applyColorMap(attr_uint8, cv2.COLORMAP_HOT)
            heatmap    = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
            blended    = (0.4 * heatmap + 0.6 * rgb_np).clip(0, 255).astype(np.uint8)
            return numpy_to_b64(blended), attr_map
        except Exception as e:
            print(f"[XAI] Integrated Gradients failed: {e}")
            return None, None

    # ─────────────────────────────────────────────────────────────────────────

    def generate_all(
        self,
        img_tensor: torch.Tensor,
        image_pil: Image.Image,
        pred: dict,
    ) -> Dict[str, Any]:
        """
        Generate all 4 XAI heatmaps for the predicted class.

        Returns dict with base64 overlays and raw numpy heatmaps.
        """
        img_tensor    = img_tensor.to(self.device)
        target_class  = CLASS_NAMES.index(pred["predicted_class"])
        rgb_np        = tensor_to_rgb(img_tensor.cpu())

        # Grad-CAM
        gradcam_b64, gradcam_raw = self._run_gradcam(img_tensor, target_class, rgb_np)

        # Grad-CAM++
        gradcam_plus_b64, gradcam_plus_raw = self._run_gradcam_plus(img_tensor, target_class, rgb_np)

        # Score-CAM (gradient-free, heavily slow on CPU - disabled for performance)
        # scorecam_b64, _ = self._run_scorecam(img_tensor, target_class, rgb_np)
        scorecam_b64 = None

        # Integrated Gradients (Reduced steps for CPU performance)
        ig_b64, _ = self._run_integrated_gradients(img_tensor, target_class, rgb_np)

        available = []
        if gradcam_b64:      available.append("gradcam")
        if gradcam_plus_b64: available.append("gradcam_plus")
        # if scorecam_b64:     available.append("scorecam")
        if ig_b64:           available.append("integrated_gradients")

        return {
            "gradcam":              gradcam_b64,
            "gradcam_plus":         gradcam_plus_b64,
            "scorecam":             scorecam_b64,
            "integrated_gradients": ig_b64,
            "gradcam_raw":          gradcam_raw,
            "gradcam_plus_raw":     gradcam_plus_raw,
            "available_methods":    available,
        }

    def get_gradcam_for_pseudo_mask(
        self, img_tensor: torch.Tensor, target_class: int
    ) -> Optional[np.ndarray]:
        """
        Generate a single Grad-CAM heatmap, return raw numpy (H, W).
        Used during segmentation training to produce pseudo-masks.
        """
        try:
            img_tensor = img_tensor.to(self.device)
            cam = GradCAM(model=self.model, target_layers=self._target_layers)
            targets = [ClassifierOutputTarget(target_class)]
            grayscale_cam = cam(input_tensor=img_tensor, targets=targets)[0]
            return grayscale_cam
        except Exception as e:
            print(f"[XAI] Pseudo-mask GradCAM failed: {e}")
            return None
