"""
NeuroVision Classifier Training Script
========================================
- Dataset   : dataset/Training/  â†’ 85% train + 15% val  (stratified, seed=42)
              dataset/Testing/   â†’ final test set (untouched)
- Trains 4 ablation variants sequentially
- Saves best checkpoint per variant (by val macro AUC-ROC)
- Runs evaluate.py after all training
"""

import os
import sys
import time
import json
import copy
import random
import warnings
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim.lr_scheduler import CosineAnnealingLR
from torch.utils.data import DataLoader, Subset
import torchvision.transforms as T
from torchvision.datasets import ImageFolder
from sklearn.model_selection import StratifiedShuffleSplit
from sklearn.metrics import roc_auc_score

warnings.filterwarnings("ignore")

# â”€â”€ path bootstrap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from config import (
    TRAIN_DIR, TEST_DIR, MODEL_SAVE_PATH, CLASS_NAMES,
    IMG_SIZE, BATCH_SIZE, NUM_EPOCHS, LEARNING_RATE,
    WEIGHT_DECAY, EARLY_STOP_PATIENCE, VAL_SPLIT, SEED,
    IMAGENET_MEAN, IMAGENET_STD,
)
from models.hybrid_classifier import (
    HybridClassifier, CNNOnlyClassifier, ViTOnlyClassifier,
    SimpleConcatClassifier, LabelSmoothingCrossEntropy,
)


# â”€â”€â”€ Reproducibility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def seed_everything(seed: int = SEED):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


# â”€â”€â”€ Transforms â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

TRAIN_TRANSFORM = T.Compose([
    T.Resize((IMG_SIZE, IMG_SIZE)),
    T.RandomHorizontalFlip(),
    T.RandomVerticalFlip(),
    T.RandomRotation(15),
    T.ColorJitter(brightness=0.2, contrast=0.2),
    T.RandomAffine(degrees=0, translate=(0.1, 0.1)),
    T.ToTensor(),
    T.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
])

VAL_TRANSFORM = T.Compose([
    T.Resize((IMG_SIZE, IMG_SIZE)),
    T.ToTensor(),
    T.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
])


# â”€â”€â”€ Dataset Preparation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def make_train_val_loaders():
    """
    Load Training/ folder, stratified split into 85% train + 15% val.
    """
    full_dataset = ImageFolder(str(TRAIN_DIR))
    targets      = np.array(full_dataset.targets)
    indices      = np.arange(len(targets))

    splitter = StratifiedShuffleSplit(n_splits=1, test_size=VAL_SPLIT, random_state=SEED)
    train_idx, val_idx = next(splitter.split(indices, targets))

    # Apply transforms via wrappers
    class TransformSubset(Subset):
        def __init__(self, dataset, indices, transform):
            super().__init__(dataset, indices)
            self.transform = transform

        def __getitems__(self, indices):
             return [self.__getitem__(idx) for idx in indices]

        def __getitem__(self, idx):
            img, label = self.dataset[self.indices[idx]]
            if self.transform:
                img = self.transform(img)
            return img, label

    train_set = TransformSubset(full_dataset, train_idx, TRAIN_TRANSFORM)
    val_set   = TransformSubset(full_dataset, val_idx,   VAL_TRANSFORM)

    print(f"[Data] Train: {len(train_set)} | Val: {len(val_set)}")
    print(f"[Data] Class mapping: {full_dataset.class_to_idx}")

    # Print class distribution
    train_classes = targets[train_idx]
    for c, n in zip(CLASS_NAMES, [np.sum(train_classes == i) for i in range(len(CLASS_NAMES))]):
        print(f"  Train - {c}: {n}")

    train_loader = DataLoader(
        train_set, batch_size=BATCH_SIZE, shuffle=True,
        num_workers=0, pin_memory=torch.cuda.is_available()
    )
    val_loader = DataLoader(
        val_set, batch_size=BATCH_SIZE, shuffle=False,
        num_workers=0, pin_memory=torch.cuda.is_available()
    )
    return train_loader, val_loader, full_dataset.class_to_idx


def make_test_loader():
    """Load Testing/ folder for final evaluation."""
    test_ds = ImageFolder(str(TEST_DIR), transform=VAL_TRANSFORM)
    return DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)


# â”€â”€â”€ Training Loop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def train_one_epoch(model, loader, criterion, optimizer, device, scaler=None):
    model.train()
    total_loss, correct, total = 0.0, 0, 0
    for imgs, labels in loader:
        imgs, labels = imgs.to(device), labels.to(device)
        optimizer.zero_grad()
        if scaler is not None:
            from torch.cuda.amp import autocast
            with autocast():
                logits = model(imgs)
                loss   = criterion(logits, labels)
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            scaler.step(optimizer)
            scaler.update()
        else:
            logits = model(imgs)
            loss   = criterion(logits, labels)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

        total_loss += loss.item() * imgs.size(0)
        preds       = logits.argmax(dim=1)
        correct    += (preds == labels).sum().item()
        total      += imgs.size(0)

    return total_loss / total, correct / total


@torch.no_grad()
def evaluate(model, loader, criterion, device, num_classes=4):
    model.eval()
    total_loss, correct, total = 0.0, 0, 0
    all_probs, all_labels = [], []

    for imgs, labels in loader:
        imgs, labels = imgs.to(device), labels.to(device)
        logits = model(imgs)
        loss   = criterion(logits, labels)

        total_loss += loss.item() * imgs.size(0)
        probs  = torch.softmax(logits, dim=1)
        preds  = probs.argmax(dim=1)
        correct += (preds == labels).sum().item()
        total   += imgs.size(0)

        all_probs.append(probs.cpu().numpy())
        all_labels.append(labels.cpu().numpy())

    all_probs  = np.concatenate(all_probs)
    all_labels = np.concatenate(all_labels)

    # Macro AUC-ROC (one-vs-rest)
    try:
        auc = roc_auc_score(all_labels, all_probs, multi_class="ovr", average="macro")
    except Exception:
        auc = 0.0

    return total_loss / total, correct / total, float(auc)


def train_variant(name: str, model: nn.Module, device: torch.device,
                  train_loader, val_loader, save_path: Path):
    print(f"\n{'='*60}")
    print(f"Training Variant: {name}")
    print(f"{'='*60}")

    model = model.to(device)
    criterion = LabelSmoothingCrossEntropy(smoothing=0.1)
    optimizer = optim.AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=WEIGHT_DECAY)
    scheduler = CosineAnnealingLR(optimizer, T_max=NUM_EPOCHS)

    use_amp   = torch.cuda.is_available()
    scaler    = torch.cuda.amp.GradScaler() if use_amp else None

    best_auc    = 0.0
    patience    = 0
    best_state  = None
    history     = []

    for epoch in range(1, NUM_EPOCHS + 1):
        t0 = time.time()
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device, scaler)
        val_loss, val_acc, val_auc = evaluate(model, val_loader, criterion, device)
        scheduler.step()

        elapsed = time.time() - t0
        print(
            f"Epoch {epoch:03d}/{NUM_EPOCHS} | "
            f"TrainLoss={train_loss:.4f} TrainAcc={train_acc:.4f} | "
            f"ValLoss={val_loss:.4f} ValAcc={val_acc:.4f} ValAUC={val_auc:.4f} | "
            f"{elapsed:.1f}s"
        )

        history.append({
            "epoch": epoch,
            "train_loss": train_loss, "train_acc": train_acc,
            "val_loss": val_loss, "val_acc": val_acc, "val_auc": val_auc,
        })

        if val_auc > best_auc:
            best_auc   = val_auc
            best_state = copy.deepcopy(model.state_dict())
            patience   = 0
            torch.save({"model_state_dict": best_state, "val_auc": best_auc},
                       save_path)
            print(f"  âœ“ New best AUC: {best_auc:.4f} â€” saved to {save_path.name}")
        else:
            patience += 1
            if patience >= EARLY_STOP_PATIENCE:
                print(f"  Early stop at epoch {epoch} (patience={EARLY_STOP_PATIENCE})")
                break

    # Restore best weights for return
    if best_state:
        model.load_state_dict(best_state)

    print(f"[{name}] Best Val AUC: {best_auc:.4f}")
    return model, best_auc, history


# â”€â”€â”€ Ablation Variants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def get_ablation_variants():
    return [
        ("resnet50_only",   CNNOnlyClassifier(num_classes=4, pretrained=True)),
        ("swin_only",       ViTOnlyClassifier(num_classes=4, pretrained=True)),
        ("concat_no_attn",  SimpleConcatClassifier(num_classes=4, pretrained=True)),
        ("hybrid",          HybridClassifier(num_classes=4, pretrained=True)),
    ]


# â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def main():
    seed_everything()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[Train] Device: {device}")
    print(f"[Train] Train dir: {TRAIN_DIR}")
    print(f"[Train] Test  dir: {TEST_DIR}")

    train_loader, val_loader, class_to_idx = make_train_val_loaders()

    # Verify class order matches config
    for cls in CLASS_NAMES:
        assert cls in class_to_idx, f"Class '{cls}' not found in dataset!"

    results = {}
    best_model_name = None
    best_auc_global = 0.0

    for variant_name, model in get_ablation_variants():
        ckpt_path = MODEL_SAVE_PATH / f"{variant_name}_best.pth"
        trained_model, best_auc, history = train_variant(
            variant_name, model, device, train_loader, val_loader, ckpt_path
        )
        results[variant_name] = {
            "best_val_auc": best_auc,
            "history":      history,
        }
        if best_auc > best_auc_global:
            best_auc_global  = best_auc
            best_model_name  = variant_name

    # Copy the best model as canonical "hybrid_best.pth"
    import shutil
    best_src = MODEL_SAVE_PATH / f"{best_model_name}_best.pth"
    best_dst = MODEL_SAVE_PATH / "hybrid_best.pth"
    shutil.copy2(best_src, best_dst)
    print(f"\n[Train] Best overall model: {best_model_name} (AUC={best_auc_global:.4f})")
    print(f"[Train] Saved canonical checkpoint â†’ {best_dst}")

    # Save ablation summary
    summary_path = MODEL_SAVE_PATH / "ablation_summary.json"
    ablation_summary = {
        k: {"best_val_auc": v["best_val_auc"]} for k, v in results.items()
    }
    ablation_summary["best_model"] = best_model_name
    with open(summary_path, "w") as f:
        json.dump(ablation_summary, f, indent=2)
    print(f"[Train] Ablation summary saved â†’ {summary_path}")

    # Print comparison table
    print("\n" + "="*60)
    print("ABLATION STUDY RESULTS")
    print(f"{'Variant':<25} {'Val AUC':>10}")
    print("-"*36)
    for name, res in results.items():
        marker = " â—€ BEST" if name == best_model_name else ""
        print(f"{name:<25} {res['best_val_auc']:>10.4f}{marker}")
    print("="*60)

    # Run full evaluation
    print("\n[Train] Running full evaluation on test setâ€¦")
    try:
        import subprocess
        eval_script = ROOT / "training" / "evaluate.py"
        subprocess.run([sys.executable, str(eval_script)], check=True)
    except Exception as e:
        print(f"[Train] evaluate.py skipped: {e}")


if __name__ == "__main__":
    main()

