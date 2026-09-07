"""
Fast Segmentation Training + Evaluation
=========================================
Skips slow per-image GradCAM by using a center-crop heuristic mask 
for notumor class and fast GradCAM for tumor classes.
Then runs full evaluation.
"""
import sys
import time
import os
from pathlib import Path

os.environ["PYTHONIOENCODING"] = "utf-8"

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "backend"))

print("=" * 70)
print("  NeuroVision -- Fast Completion Pipeline")
print("=" * 70)

# Step 1: Segmentation Training
print("\n[Pipeline] Step 1/2 -- Training Attention U-Net...")
t0 = time.time()
try:
    from training.train_segmentation import main as train_seg
    train_seg()
    print(f"\n[Pipeline] OK Seg training done in {(time.time()-t0)/60:.1f} min")
except Exception as e:
    print(f"\n[Pipeline] FAILED Seg training: {e}")
    import traceback; traceback.print_exc()

# Step 2: Evaluation
print("\n[Pipeline] Step 2/2 -- Running evaluation...")
t0 = time.time()
try:
    from training.evaluate import main as run_eval
    run_eval()
    print(f"\n[Pipeline] OK Evaluation done in {(time.time()-t0)/60:.1f} min")
except Exception as e:
    print(f"\n[Pipeline] FAILED Evaluation: {e}")
    import traceback; traceback.print_exc()

# Summary
print("\n" + "=" * 70)
print("  PIPELINE COMPLETE!")
print("=" * 70)
saved = ROOT / "saved_models"
for f in sorted(saved.glob("*")):
    mb = f.stat().st_size / 1e6
    print(f"  [OK] {f.name:<40} {mb:>7.1f} MB")
print()
print("  Start server: python -m uvicorn backend.main:app --reload --port 8000")
print("  Open: http://localhost:8000")
print("=" * 70)
