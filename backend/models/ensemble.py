"""
Ensemble wrapper for aggregating predictions from multiple ablation variants.
"""
import torch
import torch.nn.functional as F
from typing import List


class EnsembleModel:
    """
    Soft-voting ensemble over a list of PyTorch models.
    Averages softmax probabilities from all models.
    """

    def __init__(self, models: List[torch.nn.Module], device: torch.device):
        self.models = models
        self.device = device
        for m in self.models:
            m.eval()
            m.to(device)

    def predict(self, x: torch.Tensor):
        """
        Returns:
            mean_probs : (B, num_classes) averaged softmax probabilities
            all_probs  : list of (B, num_classes) per-model probabilities
        """
        x = x.to(self.device)
        all_probs = []
        with torch.no_grad():
            for model in self.models:
                logits = model(x)
                probs = F.softmax(logits, dim=-1)
                all_probs.append(probs)
        mean_probs = torch.stack(all_probs, dim=0).mean(dim=0)
        return mean_probs, all_probs
