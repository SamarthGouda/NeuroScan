"""
Attention U-Net Training Script
=================================
1. Generate fast pseudo-masks using Otsu thresholding (seconds, not hours)
2. Train Attention U-Net on those pseudo-masks
3. Save: saved_models/attention_unet_best.pth
"""
import sys
import time
import warnings
from pathlib import Path

import numpy as np
import torch
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as T
from torchvision.datasets import ImageFolder
from sklearn.model_selection import StratifiedShuffleSplit
from PIL import Image
import cv2

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from config import (
    TRAIN_DIR, MODEL_SAVE_PATH, CLASS_NAMES,
    IMG_SIZE, BATCH_SIZE, IMAGENET_MEAN, IMAGENET_STD, SEED,
)
from models.hybrid_classifier import HybridClassifier
from models.attention_unet import AttentionUNet, DiceBCELoss
from xai.xai_engine import XAIEngine


# ─── Pseudo-Mask Dataset ──────────────────────────────────────────────────────

class PseudoMaskDataset(Dataset):
    """
    Wraps raw PIL images and their pseudo-masks.
    """
    def __init__(self, images: list, masks: list):
        self.images = images
        self.masks  = masks
        self.img_tf = T.Compose([
            T.Resize((IMG_SIZE, IMG_SIZE)),
            T.ToTensor(),
            T.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
        ])

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        img  = self.images[idx]
        mask = self.masks[idx]
        img_t = self.img_tf(img)
        mask_t = torch.tensor(mask, dtype=torch.float32).unsqueeze(0)
        return img_t, mask_t


# ─── Fast Pseudo-Mask Generation ─────────────────────────────────────────────

def generate_pseudo_masks(dataset):
    """
    Fast pseudo-mask generation using Otsu thresholding + elliptical center prior.
    Runs in seconds instead of hours compared to per-image GradCAM.
    - notumor class  → empty mask (all zeros)
    - tumor classes  → Otsu threshold on grayscale + center ellipse prior
    """
    notumor_idx = CLASS_NAMES.index("notumor")
    n_total = len(dataset)
    print(f"[SegTrain] Generating fast pseudo-masks for {n_total} images...")

    images, masks = [], []

    for i in range(n_total):
        path, label = dataset.samples[i]
        pil_img = Image.open(path).convert("RGB")
        img_resized = pil_img.resize((IMG_SIZE, IMG_SIZE))
        img_np = np.array(img_resized)

        if label == notumor_idx:
            binary = np.zeros((IMG_SIZE, IMG_SIZE), dtype=np.float32)
        else:
            gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)

            # Otsu threshold
            _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

            # Center ellipse prior (tumors rarely at image border)
            center_mask = np.zeros((IMG_SIZE, IMG_SIZE), dtype=np.uint8)
            cv2.ellipse(center_mask,
                        (IMG_SIZE // 2, IMG_SIZE // 2),
                        (int(IMG_SIZE * 0.42), int(IMG_SIZE * 0.42)),
                        0, 0, 360, 255, -1)

            combined = cv2.bitwise_and(otsu, center_mask)

            # Morphological cleanup
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
            combined = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel)
            combined = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel)

            binary = (combined > 0).astype(np.float32)

            # Fallback: if mask is degenerate, use fixed center ROI
            frac = binary.mean()
            if frac < 0.01 or frac > 0.70:
                binary = np.zeros((IMG_SIZE, IMG_SIZE), dtype=np.float32)
                binary[IMG_SIZE // 3: 2 * IMG_SIZE // 3,
                       IMG_SIZE // 3: 2 * IMG_SIZE // 3] = 1.0

        images.append(img_resized)
        masks.append(binary)

        if (i + 1) % 500 == 0:
            print(f"  {i + 1}/{n_total} done...")

    print(f"[SegTrain] Pseudo-masks ready: {len(masks)}")
    return images, masks


# ─── Training Loop ────────────────────────────────────────────────────────────

def train_unet(unet, loader, optimizer, criterion, device):
    unet.train()
    total_loss = 0.0
    n = 0
    for imgs, masks in loader:
        imgs, masks = imgs.to(device), masks.to(device)
        optimizer.zero_grad()
        pred = unet(imgs)
        loss = criterion(pred, masks)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * imgs.size(0)
        n += imgs.size(0)
    return total_loss / n


@torch.no_grad()
def val_unet(unet, loader, criterion, device):
    unet.eval()
    total_loss, dice_sum, n = 0.0, 0.0, 0
    for imgs, masks in loader:
        imgs, masks = imgs.to(device), masks.to(device)
        pred = unet(imgs)
        loss = criterion(pred, masks)
        total_loss += loss.item() * imgs.size(0)

        # Dice metric
        pred_bin = (pred > 0.5).float()
        inter    = (pred_bin * masks).sum(dim=(1, 2, 3))
        union    = pred_bin.sum(dim=(1, 2, 3)) + masks.sum(dim=(1, 2, 3)) + 1e-8
        dice_sum += (2 * inter / union).sum().item()
        n += imgs.size(0)
    return total_loss / n, dice_sum / n


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    import random
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[SegTrain] Device: {device}")

    # ── Load raw dataset for pseudo-mask generation ──────────────────────────
    raw_dataset = ImageFolder(str(TRAIN_DIR))
    images, masks = generate_pseudo_masks(raw_dataset)

    # Split 85/15
    n       = len(images)
    indices = list(range(n))
    labels  = [raw_dataset.targets[i] for i in range(n)]
    splitter = StratifiedShuffleSplit(n_splits=1, test_size=0.15, random_state=SEED)
    train_idx, val_idx = next(splitter.split(indices, labels))

    train_imgs = [images[i] for i in train_idx]
    train_msks = [masks[i]  for i in train_idx]
    val_imgs   = [images[i] for i in val_idx]
    val_msks   = [masks[i]  for i in val_idx]

    train_ds = PseudoMaskDataset(train_imgs, train_msks)
    val_ds   = PseudoMaskDataset(val_imgs,   val_msks)

    train_loader = DataLoader(train_ds, batch_size=16, shuffle=True,  num_workers=0)
    val_loader   = DataLoader(val_ds,   batch_size=16, shuffle=False, num_workers=0)

    print(f"[SegTrain] Seg train: {len(train_ds)} | Val: {len(val_ds)}")

    # ── Train U-Net ──────────────────────────────────────────────────────────
    unet      = AttentionUNet(in_channels=3, out_channels=1, pretrained=True).to(device)
    criterion = DiceBCELoss()
    optimizer = optim.AdamW(unet.parameters(), lr=1e-4, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=30)

    best_dice  = 0.0
    best_state = None
    patience   = 0
    N_EPOCHS   = 30

    for epoch in range(1, N_EPOCHS + 1):
        t0         = time.time()
        train_loss = train_unet(unet, train_loader, optimizer, criterion, device)
        val_loss, val_dice = val_unet(unet, val_loader, criterion, device)
        scheduler.step()

        elapsed = time.time() - t0
        print(
            f"Epoch {epoch:02d}/{N_EPOCHS} | "
            f"TrainLoss={train_loss:.4f} | ValLoss={val_loss:.4f} ValDice={val_dice:.4f} | "
            f"{elapsed:.1f}s"
        )

        if val_dice > best_dice:
            best_dice  = val_dice
            best_state = {k: v.clone() for k, v in unet.state_dict().items()}
            patience   = 0
            ckpt = MODEL_SAVE_PATH / "attention_unet_best.pth"
            torch.save({"model_state_dict": best_state, "val_dice": best_dice}, ckpt)
            print(f"  New best Dice: {best_dice:.4f} -- saved")
        else:
            patience += 1
            if patience >= 8:
                print(f"  Early stop at epoch {epoch}")
                break

    print(f"\n[SegTrain] Done. Best Val Dice: {best_dice:.4f}")
    print(f"[SegTrain] Checkpoint: {MODEL_SAVE_PATH / 'attention_unet_best.pth'}")


if __name__ == "__main__":
    main()
