"""
Monte Carlo Dropout uncertainty quantification.

Runs N stochastic forward passes with dropout ENABLED at inference time
to estimate predictive uncertainty via mean and std of softmax probabilities.
"""
import numpy as np
import torch
import torch.nn.functional as F
from typing import Dict

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import CLASS_NAMES, MC_DROPOUT_PASSES, UNCERTAINTY_LOW, UNCERTAINTY_HIGH


def enable_dropout(model: torch.nn.Module):
    """Keep all Dropout layers in train-mode during inference for MC-Dropout."""
    for m in model.modules():
        if isinstance(m, torch.nn.Dropout):
            m.train()


class MCDropoutPredictor:
    def __init__(self, model: torch.nn.Module, device: torch.device):
        self.model  = model
        self.device = device

    def predict_with_uncertainty(
        self,
        image_tensor: torch.Tensor,
        n_passes: int = MC_DROPOUT_PASSES,
    ) -> Dict:
        """
        Args:
            image_tensor : preprocessed tensor shape (1, C, H, W)
            n_passes     : number of stochastic forward passes

        Returns dict with:
            predicted_class, confidence, uncertainty, mean_probabilities,
            std_probabilities, entropy, uncertainty_tier, clinical_flag
        """
        self.model.eval()
        enable_dropout(self.model)          # re-enable Dropout layers

        image_tensor = image_tensor.to(self.device)
        predictions = []

        with torch.no_grad():
            for _ in range(n_passes):
                logits = self.model(image_tensor)               # (1, 4)
                probs  = F.softmax(logits, dim=-1)
                predictions.append(probs.cpu().numpy())

        predictions = np.array(predictions)                     # (N, 1, 4)
        mean_probs  = predictions.mean(axis=0).squeeze()        # (4,)
        std_probs   = predictions.std(axis=0).squeeze()         # (4,)

        pred_class       = int(mean_probs.argmax())
        pred_confidence  = float(mean_probs[pred_class])
        pred_uncertainty = float(std_probs[pred_class])

        # Predictive entropy
        entropy = float(-np.sum(mean_probs * np.log(mean_probs + 1e-8)))

        # Uncertainty tier
        if pred_uncertainty < UNCERTAINTY_LOW:
            tier          = "LOW"
            clinical_flag = "High confidence prediction. Model is certain."
        elif pred_uncertainty < UNCERTAINTY_HIGH:
            tier          = "MEDIUM"
            clinical_flag = (
                "Moderate uncertainty. Consider corroborating with clinical findings."
            )
        else:
            tier          = "HIGH"
            clinical_flag = (
                "High uncertainty. Radiologist review strongly recommended."
            )

        return {
            "predicted_class":     CLASS_NAMES[pred_class],
            "mean_probabilities":  mean_probs.tolist(),
            "std_probabilities":   std_probs.tolist(),
            "confidence":          pred_confidence,
            "uncertainty":         pred_uncertainty,
            "entropy":             entropy,
            "uncertainty_tier":    tier,
            "clinical_flag":       clinical_flag,
        }
