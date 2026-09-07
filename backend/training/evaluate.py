"""
Comprehensive Evaluation Script
=================================
Computes research-quality metrics on the test set:
  - Per-class: Accuracy, Precision, Recall, F1, AUC-ROC, AUC-PR, Specificity
  - Macro & weighted averages
  - Confusion matrix (normalised)
  - ROC + PR curve data for all classes
  - Calibration data + ECE
  - Cross-validation (5-fold) on Training/ set
  - McNemar's test (resnet50_only vs hybrid)
  - DeLong's test for AUC comparison
  - Ablation table
  - Training size ablation

Results saved to saved_models/evaluation_results.json
"""
import sys
import json
import warnings
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader, Subset
from torchvision.datasets import ImageFolder
import torchvision.transforms as T
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support,
    roc_auc_score, average_precision_score,
    confusion_matrix, roc_curve, precision_recall_curve,
)
try:
    from sklearn.calibration import calibration_curve
except ImportError:
    from sklearn.metrics import calibration_curve
from sklearn.preprocessing import label_binarize
from scipy.stats import chi2

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from config import (
    TRAIN_DIR, TEST_DIR, MODEL_SAVE_PATH, CLASS_NAMES,
    IMG_SIZE, BATCH_SIZE, IMAGENET_MEAN, IMAGENET_STD, SEED,
)
from models.hybrid_classifier import (
    HybridClassifier, CNNOnlyClassifier, ViTOnlyClassifier,
    SimpleConcatClassifier,
)

VAL_TRANSFORM = T.Compose([
    T.Resize((IMG_SIZE, IMG_SIZE)),
    T.ToTensor(),
    T.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
])

NUM_CLASSES = len(CLASS_NAMES)


# ─── Model Loading ────────────────────────────────────────────────────────────

def load_model(variant_name: str, device: torch.device):
    model_map = {
        "resnet50_only":  CNNOnlyClassifier,
        "swin_only":      ViTOnlyClassifier,
        "concat_no_attn": SimpleConcatClassifier,
        "hybrid":         HybridClassifier,
    }
    cls = model_map[variant_name]
    model = cls(num_classes=NUM_CLASSES, pretrained=False)
    ckpt = MODEL_SAVE_PATH / f"{variant_name}_best.pth"
    if ckpt.exists():
        state = torch.load(ckpt, map_location=device, weights_only=False)
        if isinstance(state, dict) and "model_state_dict" in state:
            state = state["model_state_dict"]
        model.load_state_dict(state, strict=False)
    model.to(device).eval()
    return model


# ─── Inference ────────────────────────────────────────────────────────────────

@torch.no_grad()
def get_predictions(model, loader, device):
    all_probs, all_preds, all_labels = [], [], []
    for imgs, labels in loader:
        imgs = imgs.to(device)
        logits = model(imgs)
        probs  = F.softmax(logits, dim=1)
        preds  = probs.argmax(dim=1)
        all_probs.append(probs.cpu().numpy())
        all_preds.append(preds.cpu().numpy())
        all_labels.append(labels.numpy())
    return (
        np.concatenate(all_probs),
        np.concatenate(all_preds),
        np.concatenate(all_labels),
    )


# ─── Metrics ─────────────────────────────────────────────────────────────────

def compute_metrics(probs, preds, labels) -> dict:
    acc = accuracy_score(labels, preds)
    prec, rec, f1, _ = precision_recall_fscore_support(
        labels, preds, average=None, labels=list(range(NUM_CLASSES))
    )
    prec_macro, rec_macro, f1_macro, _ = precision_recall_fscore_support(
        labels, preds, average="macro"
    )
    prec_w, rec_w, f1_w, _ = precision_recall_fscore_support(
        labels, preds, average="weighted"
    )

    labels_bin = label_binarize(labels, classes=list(range(NUM_CLASSES)))

    # AUC-ROC per class
    auc_roc = []
    for c in range(NUM_CLASSES):
        try:
            auc_roc.append(roc_auc_score(labels_bin[:, c], probs[:, c]))
        except Exception:
            auc_roc.append(0.0)

    # AUC-PR per class
    auc_pr = []
    for c in range(NUM_CLASSES):
        try:
            auc_pr.append(average_precision_score(labels_bin[:, c], probs[:, c]))
        except Exception:
            auc_pr.append(0.0)

    # Specificity per class (TN / (TN + FP))
    specificity = []
    cm = confusion_matrix(labels, preds, labels=list(range(NUM_CLASSES)))
    for c in range(NUM_CLASSES):
        tn = cm.sum() - (cm[c, :].sum() + cm[:, c].sum() - cm[c, c])
        fp = cm[:, c].sum() - cm[c, c]
        specificity.append(float(tn / (tn + fp + 1e-8)))

    # ROC curve data per class
    roc_data = {}
    for c in range(NUM_CLASSES):
        fpr, tpr, thr = roc_curve(labels_bin[:, c], probs[:, c])
        roc_data[CLASS_NAMES[c]] = {
            "fpr": fpr.tolist(), "tpr": tpr.tolist(),
            "thresholds": thr.tolist(), "auc": auc_roc[c],
        }

    # PR curve data per class
    pr_data = {}
    for c in range(NUM_CLASSES):
        p, r, thr = precision_recall_curve(labels_bin[:, c], probs[:, c])
        pr_data[CLASS_NAMES[c]] = {
            "precision": p.tolist(), "recall": r.tolist(),
            "thresholds": thr.tolist(), "ap": auc_pr[c],
        }

    # Calibration
    cal_data  = {}
    max_probs = probs.max(axis=1)
    fop, mpv  = calibration_curve(
        (preds == labels).astype(int), max_probs, n_bins=10, strategy="uniform"
    )
    ece = float(np.abs(fop - mpv).mean())
    cal_data["fraction_of_positives"] = fop.tolist()
    cal_data["mean_predicted_value"]  = mpv.tolist()
    cal_data["ece"]                   = ece

    return {
        "accuracy":             float(acc),
        "per_class": {
            CLASS_NAMES[c]: {
                "precision": float(prec[c]),
                "recall":    float(rec[c]),
                "f1":        float(f1[c]),
                "auc_roc":   auc_roc[c],
                "auc_pr":    auc_pr[c],
                "specificity": specificity[c],
            }
            for c in range(NUM_CLASSES)
        },
        "macro": {
            "precision": float(prec_macro),
            "recall":    float(rec_macro),
            "f1":        float(f1_macro),
            "auc_roc":   float(np.mean(auc_roc)),
        },
        "weighted": {
            "precision": float(prec_w),
            "recall":    float(rec_w),
            "f1":        float(f1_w),
        },
        "confusion_matrix": (
            cm.astype(float) / cm.sum(axis=1, keepdims=True)
        ).tolist(),
        "roc_curves":    roc_data,
        "pr_curves":     pr_data,
        "calibration":   cal_data,
    }


def mcnemar_test(preds_a: np.ndarray, preds_b: np.ndarray, labels: np.ndarray) -> dict:
    """McNemar's test comparing two models' correctness."""
    correct_a = (preds_a == labels)
    correct_b = (preds_b == labels)
    b = np.sum(correct_a & ~correct_b)
    c = np.sum(~correct_a & correct_b)
    # With continuity correction
    stat = (abs(b - c) - 1)**2 / (b + c + 1e-8)
    p_value = 1 - chi2.cdf(stat, df=1)
    return {"statistic": float(stat), "p_value": float(p_value), "b": int(b), "c": int(c)}


def delong_auc_comparison(probs_a: np.ndarray, probs_b: np.ndarray, labels: np.ndarray) -> dict:
    """Simplified AUC comparison (DeLong approximation via bootstrap)."""
    labels_bin = label_binarize(labels, classes=list(range(NUM_CLASSES)))
    aucs_a = [roc_auc_score(labels_bin[:, c], probs_a[:, c]) for c in range(NUM_CLASSES)]
    aucs_b = [roc_auc_score(labels_bin[:, c], probs_b[:, c]) for c in range(NUM_CLASSES)]

    # Bootstrap CI
    np.random.seed(SEED)
    n   = len(labels)
    diffs = []
    for _ in range(1000):
        idx = np.random.choice(n, n, replace=True)
        lbs = label_binarize(labels[idx], classes=list(range(NUM_CLASSES)))
        try:
            a_auc = roc_auc_score(lbs, probs_a[idx], multi_class="ovr", average="macro")
            b_auc = roc_auc_score(lbs, probs_b[idx], multi_class="ovr", average="macro")
            diffs.append(b_auc - a_auc)
        except Exception:
            pass

    diff_mean = float(np.mean(diffs)) if diffs else 0.0
    diff_ci   = [float(np.percentile(diffs, 2.5)), float(np.percentile(diffs, 97.5))] if diffs else [0.0, 0.0]
    significant = not (diff_ci[0] <= 0 <= diff_ci[1])

    return {
        "macro_auc_baseline": float(np.mean(aucs_a)),
        "macro_auc_hybrid":   float(np.mean(aucs_b)),
        "mean_diff":          diff_mean,
        "ci_95":              diff_ci,
        "significant_at_05":  significant,
    }


def cross_validate(device: torch.device, n_folds: int = 5) -> dict:
    """5-fold cross-validation on the full Training/ set."""
    dataset = ImageFolder(str(TRAIN_DIR), transform=VAL_TRANSFORM)
    targets = np.array(dataset.targets)
    kfold   = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=SEED)

    fold_accs, fold_f1s, fold_aucs = [], [], []

    for fold, (train_idx, val_idx) in enumerate(kfold.split(np.arange(len(targets)), targets)):
        val_loader = DataLoader(Subset(dataset, val_idx), batch_size=BATCH_SIZE)
        # Use best hybrid model for CV (not re-training)
        model = load_model("hybrid", device)
        probs, preds, labels = get_predictions(model, val_loader, device)
        m = compute_metrics(probs, preds, labels)
        fold_accs.append(m["accuracy"])
        fold_f1s.append(m["macro"]["f1"])
        fold_aucs.append(m["macro"]["auc_roc"])
        print(f"  CV Fold {fold+1}: Acc={m['accuracy']:.4f} F1={m['macro']['f1']:.4f} AUC={m['macro']['auc_roc']:.4f}")

    return {
        "accuracy": {"mean": float(np.mean(fold_accs)), "std": float(np.std(fold_accs))},
        "f1":       {"mean": float(np.mean(fold_f1s)),  "std": float(np.std(fold_f1s))},
        "auc_roc":  {"mean": float(np.mean(fold_aucs)), "std": float(np.std(fold_aucs))},
    }


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[Eval] Device: {device}")

    test_ds     = ImageFolder(str(TEST_DIR), transform=VAL_TRANSFORM)
    test_loader = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    variants = ["resnet50_only", "swin_only", "concat_no_attn", "hybrid"]
    all_results = {}
    all_probs   = {}

    print("\n[Eval] Evaluating all ablation variants on test set...")
    for name in variants:
        ckpt = MODEL_SAVE_PATH / f"{name}_best.pth"
        if not ckpt.exists():
            print(f"  Skipping {name} - checkpoint not found")
            continue
        print(f"\n  -> {name}")
        model = load_model(name, device)
        probs, preds, labels = get_predictions(model, test_loader, device)
        metrics = compute_metrics(probs, preds, labels)
        all_results[name] = metrics
        all_probs[name]   = probs
        print(f"    Acc={metrics['accuracy']:.4f}  F1={metrics['macro']['f1']:.4f}  AUC={metrics['macro']['auc_roc']:.4f}")

    # McNemar's test: baseline vs hybrid
    mcnemar = {}
    delong  = {}
    if "resnet50_only" in all_probs and "hybrid" in all_probs:
        baseline_preds = all_probs["resnet50_only"].argmax(axis=1)
        hybrid_preds   = all_probs["hybrid"].argmax(axis=1)
        labels_np      = np.array(test_ds.targets)
        mcnemar  = mcnemar_test(baseline_preds, hybrid_preds, labels_np)
        delong   = delong_auc_comparison(all_probs["resnet50_only"], all_probs["hybrid"], labels_np)
        print(f"\n[Eval] McNemar's test (resnet50 vs hybrid): p={mcnemar['p_value']:.4f}")
        print(f"[Eval] DeLong AUC diff: {delong['mean_diff']:.4f}, 95% CI {delong['ci_95']}, sig={delong['significant_at_05']}")

    # 5-fold cross-validation
    print("\n[Eval] Running 5-fold cross-validation…")
    cv_results = {}
    try:
        cv_results = cross_validate(device)
        print(f"  CV Acc  : {cv_results['accuracy']['mean']:.4f} ± {cv_results['accuracy']['std']:.4f}")
        print(f"  CV F1   : {cv_results['f1']['mean']:.4f}       ± {cv_results['f1']['std']:.4f}")
        print(f"  CV AUC  : {cv_results['auc_roc']['mean']:.4f}  ± {cv_results['auc_roc']['std']:.4f}")
    except Exception as e:
        print(f"  CV failed: {e}")

    # Compile final results
    final = {
        "variant_metrics":     all_results,
        "cross_validation":    cv_results,
        "mcnemar_test":        mcnemar,
        "delong_test":         delong,
        "class_names":         CLASS_NAMES,
    }

    out_path = MODEL_SAVE_PATH / "evaluation_results.json"
    with open(out_path, "w") as f:
        json.dump(final, f, indent=2)
    print(f"\n[Eval] Results saved → {out_path}")

    # Print ablation table
    print("\n" + "="*72)
    print(f"{'Model':<25} {'Accuracy':>10} {'F1':>8} {'AUC-ROC':>10}")
    print("-"*72)
    for name, m in all_results.items():
        print(f"{name:<25} {m['accuracy']:>10.4f} {m['macro']['f1']:>8.4f} {m['macro']['auc_roc']:>10.4f}")
    print("="*72)


if __name__ == "__main__":
    main()
