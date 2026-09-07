"""
Attention U-Net for tumor segmentation.

Since ground-truth segmentation masks are not available, this U-Net is trained
on Grad-CAM pseudo-masks (threshold 0.5) generated from the trained classifier.
The model uses a ResNet34 encoder (pretrained) with attention gates in skip
connections and Dice + BCE combined loss.

This is clearly labelled "pseudo-label based segmentation" in reports.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models


# ─── Building Blocks ─────────────────────────────────────────────────────────

class ConvBNReLU(nn.Module):
    def __init__(self, in_ch, out_ch, kernel=3, padding=1):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, kernel, padding=padding, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, kernel, padding=padding, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
        )

    def forward(self, x):
        return self.block(x)


class AttentionGate(nn.Module):
    """
    Additive attention gate for skip connections.
    g  : gating signal from decoder path
    x  : encoder feature map
    out: attention-weighted x
    """
    def __init__(self, g_ch, x_ch, inter_ch):
        super().__init__()
        self.Wg = nn.Sequential(nn.Conv2d(g_ch, inter_ch, 1, bias=True))
        self.Wx = nn.Sequential(nn.Conv2d(x_ch, inter_ch, 1, bias=True))
        self.psi = nn.Sequential(
            nn.Conv2d(inter_ch, 1, 1, bias=True),
            nn.Sigmoid(),
        )
        self.relu = nn.ReLU(inplace=True)

    def forward(self, g, x):
        # Resize g to match x spatial dims
        g_resized = F.interpolate(g, size=x.shape[2:], mode="bilinear", align_corners=False)
        attn = self.relu(self.Wg(g_resized) + self.Wx(x))
        attn = self.psi(attn)   # (B, 1, H, W)
        return attn * x


class UpBlock(nn.Module):
    def __init__(self, in_ch, skip_ch, out_ch):
        super().__init__()
        self.up   = nn.ConvTranspose2d(in_ch, in_ch // 2, kernel_size=2, stride=2)
        self.attn = AttentionGate(g_ch=in_ch // 2, x_ch=skip_ch, inter_ch=skip_ch // 2)
        self.conv = ConvBNReLU(in_ch // 2 + skip_ch, out_ch)

    def forward(self, x, skip):
        x    = self.up(x)
        skip = self.attn(x, skip)
        # Align spatial dims (rounding artefacts from odd sizes)
        if x.shape[2:] != skip.shape[2:]:
            x = F.interpolate(x, size=skip.shape[2:], mode="bilinear", align_corners=False)
        x = torch.cat([x, skip], dim=1)
        return self.conv(x)


# ─── Full Attention U-Net ─────────────────────────────────────────────────────

class AttentionUNet(nn.Module):
    """
    Encoder: ResNet34 pretrained backbone (first 4 layer groups).
    Decoder: 4 up-blocks with attention gates.
    Output : single-channel sigmoid mask.
    """
    def __init__(self, in_channels: int = 3, out_channels: int = 1, pretrained: bool = True):
        super().__init__()
        resnet = models.resnet34(weights=models.ResNet34_Weights.IMAGENET1K_V1 if pretrained else None)

        # Encoder stages
        self.enc0 = nn.Sequential(resnet.conv1, resnet.bn1, resnet.relu)  # 64, /2
        self.pool0 = resnet.maxpool                                        # /4
        self.enc1 = resnet.layer1   # 64,  /4
        self.enc2 = resnet.layer2   # 128, /8
        self.enc3 = resnet.layer3   # 256, /16
        self.enc4 = resnet.layer4   # 512, /32

        # Bridge
        self.bridge = ConvBNReLU(512, 512)

        # Decoder
        self.up4 = UpBlock(512, 256, 256)
        self.up3 = UpBlock(256, 128, 128)
        self.up2 = UpBlock(128,  64,  64)
        self.up1 = UpBlock( 64,  64,  64)

        # Final upsample × 2 to restore full resolution
        self.final_up = nn.ConvTranspose2d(64, 32, kernel_size=2, stride=2)
        self.final_conv = nn.Conv2d(32, out_channels, kernel_size=1)

    def forward(self, x):
        # Encoder
        e0 = self.enc0(x)       # (B, 64, H/2, W/2)
        e0p = self.pool0(e0)    # (B, 64, H/4, W/4)
        e1 = self.enc1(e0p)     # (B, 64, H/4, W/4)
        e2 = self.enc2(e1)      # (B, 128, H/8, W/8)
        e3 = self.enc3(e2)      # (B, 256, H/16, W/16)
        e4 = self.enc4(e3)      # (B, 512, H/32, W/32)

        # Bridge
        b = self.bridge(e4)

        # Decoder
        d4 = self.up4(b,  e3)
        d3 = self.up3(d4, e2)
        d2 = self.up2(d3, e1)
        d1 = self.up1(d2, e0)

        out = self.final_up(d1)
        out = F.interpolate(out, size=x.shape[2:], mode="bilinear", align_corners=False)
        return torch.sigmoid(self.final_conv(out))


# ─── Combined Loss ────────────────────────────────────────────────────────────

class DiceBCELoss(nn.Module):
    def __init__(self, smooth: float = 1.0):
        super().__init__()
        self.smooth = smooth
        self.bce = nn.BCELoss()

    def forward(self, pred: torch.Tensor, target: torch.Tensor):
        bce_loss = self.bce(pred, target)
        # Dice
        pred_flat   = pred.view(-1)
        target_flat = target.view(-1)
        intersection = (pred_flat * target_flat).sum()
        dice_loss = 1 - (2.0 * intersection + self.smooth) / (
            pred_flat.sum() + target_flat.sum() + self.smooth
        )
        return bce_loss + dice_loss
