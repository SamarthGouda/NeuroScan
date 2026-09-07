"""
Risk stratification engine.

Computes a composite risk score from:
  - tumor type base risk weight
  - segmentation area (size factor)
  - uncertainty penalty
  - confidence weighting
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import RISK_WEIGHTS


def compute_risk_score(
    prediction_result: dict,
    segmentation_area_pixels: int,
    image_size: int = 224,
) -> dict:
    """
    Args:
        prediction_result        : output dict from MCDropoutPredictor
        segmentation_area_pixels : number of non-zero pixels in the seg mask
        image_size               : side length of the square image (pixels)

    Returns a dict with keys:
        score, level, color, recommendation, followup
    """
    tumor_type  = prediction_result["predicted_class"]
    confidence  = prediction_result["confidence"]
    uncertainty = prediction_result["uncertainty"]

    base_risk = RISK_WEIGHTS.get(tumor_type, 0.5)

    # Size factor: proportion of total image covered by tumor region
    size_factor = min(segmentation_area_pixels / (image_size * image_size), 1.0)

    # Uncertainty penalty: unknown = risky
    uncertainty_penalty = uncertainty * 0.3

    # Composite score
    risk_score = (
        base_risk           * 0.5 +
        size_factor         * 0.3 +
        uncertainty_penalty * 0.2
    ) * confidence

    risk_score = min(float(risk_score), 1.0)

    if risk_score > 0.65:
        return {
            "score":          risk_score,
            "level":          "HIGH",
            "color":          "red",
            "recommendation": (
                "Urgent specialist referral recommended. Likely malignant."
            ),
            "followup": (
                "Immediate neurosurgical consultation within 48 hours. "
                "MRI with gadolinium contrast enhancement advised."
            ),
        }
    elif risk_score > 0.35:
        return {
            "score":          risk_score,
            "level":          "MEDIUM",
            "color":          "amber",
            "recommendation": (
                "Further imaging and clinical correlation advised."
            ),
            "followup": (
                "Follow-up MRI in 4–6 weeks. "
                "Oncology referral if symptoms worsen."
            ),
        }
    else:
        return {
            "score":          risk_score,
            "level":          "LOW",
            "color":          "green",
            "recommendation": "No immediate action required.",
            "followup":       "Routine annual screening recommended.",
        }
