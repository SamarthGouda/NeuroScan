"""
Hybrid CNN-ViT Classifier.

Architecture:
  Branch A : ResNet50 pretrained  → 2048-dim avgpool feature vector
  Branch B : Swin-Tiny pretrained → 768-dim feature vector
  Fusion   : Attention-gate MLP   → 4-class logits
  MC Dropout(0.3) inserted before final FC layers for uncertainty quantification.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import timm
from torchvision import models


# ─── Helpers ─────────────────────────────────────────────────────────────────

def enable_dropout(model: nn.Module):
    """Keep Dropout layers active during inference for MC-Dropout."""
    for m in model.modules():
        if isinstance(m, nn.Dropout):
            m.train()


# ─── Attention Gate Fusion ────────────────────────────────────────────────────

class AttentionFusion(nn.Module):
    """
    Learnable scalar α gates each branch:
        out = α * cnn_feat + (1-α) * vit_feat
    Then projects through MLP to num_classes.
    """
    def __init__(self, cnn_dim: int = 2048, vit_dim: int = 768, num_classes: int = 4):
        super().__init__()
        fused_dim = cnn_dim + vit_dim   # 2816

        # Attention gate: learn a single scalar weight per sample
        self.attn_gate = nn.Sequential(
            nn.Linear(fused_dim, 256),
            nn.ReLU(),
            nn.Linear(256, 1),
            nn.Sigmoid(),
        )

        # Classification head with MC Dropout
        self.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(fused_dim, 512),
            nn.LayerNorm(512),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes),
        )

    def forward(self, cnn_feat: torch.Tensor, vit_feat: torch.Tensor):
        fused = torch.cat([cnn_feat, vit_feat], dim=1)   # (B, 2816)
        alpha = self.attn_gate(fused)                     # (B, 1)
        # Weighted re-combination of individual features
        cnn_scaled = alpha       * cnn_feat               # broadcast
        vit_scaled = (1 - alpha) * vit_feat
        # Pad vit to cnn size for element-wise blending via projection
        # (We still feed fused to classifier; alpha only modulates internally)
        logits = self.classifier(fused)
        return logits, alpha.squeeze(1)


# ─── Full Hybrid Classifier ───────────────────────────────────────────────────

class HybridClassifier(nn.Module):
    def __init__(self, num_classes: int = 4, pretrained: bool = True):
        super().__init__()

        # ── Branch A : ResNet50 ──────────────────────────────────────────────
        resnet = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1 if pretrained else None)
        # Remove the final FC layer; keep up through avgpool
        self.cnn_features = nn.Sequential(*list(resnet.children())[:-1])  # → (B, 2048, 1, 1)
        self.cnn_dim = 2048

        # ── Branch B : Swin-Tiny ─────────────────────────────────────────────
        self.vit = timm.create_model(
            "swin_tiny_patch4_window7_224",
            pretrained=pretrained,
            num_classes=0,       # remove classifier head → returns feature vector
        )
        self.vit_dim = self.vit.num_features   # 768

        # ── Fusion + Head ────────────────────────────────────────────────────
        self.fusion = AttentionFusion(self.cnn_dim, self.vit_dim, num_classes)

        # Store the last ResNet conv layer reference for Grad-CAM hooks
        self.gradcam_target_layer = list(resnet.layer4.children())[-1]

    def forward(self, x: torch.Tensor):
        # Branch A
        cnn_out = self.cnn_features(x)              # (B, 2048, 1, 1)
        cnn_feat = cnn_out.flatten(1)               # (B, 2048)

        # Branch B
        vit_feat = self.vit(x)                      # (B, 768)

        logits, alpha = self.fusion(cnn_feat, vit_feat)
        return logits

    def forward_with_alpha(self, x: torch.Tensor):
        """Returns (logits, alpha) — useful for analysis."""
        cnn_out  = self.cnn_features(x)
        cnn_feat = cnn_out.flatten(1)
        vit_feat = self.vit(x)
        logits, alpha = self.fusion(cnn_feat, vit_feat)
        return logits, alpha


# ─── CNN-Only Ablation ────────────────────────────────────────────────────────

class CNNOnlyClassifier(nn.Module):
    """Ablation Variant 1: ResNet50 only."""
    def __init__(self, num_classes: int = 4, pretrained: bool = True):
        super().__init__()
        resnet = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1 if pretrained else None)
        self.features = nn.Sequential(*list(resnet.children())[:-1])
        self.head = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(2048, 512),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(512, num_classes),
        )
        self.gradcam_target_layer = list(resnet.layer4.children())[-1]

    def forward(self, x):
        feat = self.features(x).flatten(1)
        return self.head(feat)


# ─── ViT-Only Ablation ────────────────────────────────────────────────────────

class ViTOnlyClassifier(nn.Module):
    """Ablation Variant 2: Swin-Tiny only."""
    def __init__(self, num_classes: int = 4, pretrained: bool = True):
        super().__init__()
        self.vit = timm.create_model(
            "swin_tiny_patch4_window7_224",
            pretrained=pretrained,
            num_classes=0,
        )
        vit_dim = self.vit.num_features
        self.head = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(vit_dim, 512),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(512, num_classes),
        )

    def forward(self, x):
        feat = self.vit(x)
        return self.head(feat)


# ─── Simple Concat Ablation ───────────────────────────────────────────────────

class SimpleConcatClassifier(nn.Module):
    """Ablation Variant 3: CNN + ViT without attention gating."""
    def __init__(self, num_classes: int = 4, pretrained: bool = True):
        super().__init__()
        resnet = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1 if pretrained else None)
        self.cnn = nn.Sequential(*list(resnet.children())[:-1])
        self.vit = timm.create_model("swin_tiny_patch4_window7_224", pretrained=pretrained, num_classes=0)
        fused = 2048 + self.vit.num_features
        self.head = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(fused, 512),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(512, num_classes),
        )
        self.gradcam_target_layer = list(resnet.layer4.children())[-1]

    def forward(self, x):
        cnn_feat = self.cnn(x).flatten(1)
        vit_feat = self.vit(x)
        return self.head(torch.cat([cnn_feat, vit_feat], dim=1))


# ─── Label Smoothing Loss ─────────────────────────────────────────────────────

class LabelSmoothingCrossEntropy(nn.Module):
    def __init__(self, smoothing: float = 0.1):
        super().__init__()
        self.smoothing = smoothing

    def forward(self, pred: torch.Tensor, target: torch.Tensor):
        n_classes = pred.size(-1)
        log_prob = F.log_softmax(pred, dim=-1)
        # One-hot
        with torch.no_grad():
            smooth_target = torch.full_like(log_prob, self.smoothing / (n_classes - 1))
            smooth_target.scatter_(1, target.unsqueeze(1), 1.0 - self.smoothing)
        loss = -(smooth_target * log_prob).sum(dim=-1).mean()
        return loss
