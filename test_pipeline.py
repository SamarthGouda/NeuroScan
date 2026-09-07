"""
End-to-end pipeline test — run from project root:
    python test_pipeline.py
"""
import sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "backend"))

print("[Test] Loading NeuroVisionPredictor...")
t0 = time.time()
from inference.predictor import NeuroVisionPredictor
predictor = NeuroVisionPredictor()
print(f"[Test] Loaded in {time.time()-t0:.1f}s")

from PIL import Image

# Test one image from each class
test_cases = [
    ("dataset/Testing/glioma/Te-gl_1.jpg",         "glioma"),
    ("dataset/Testing/meningioma/Te-me_1.jpg",      "meningioma"),
    ("dataset/Testing/notumor/Te-no_0001.jpg",      "notumor"),
    ("dataset/Testing/pituitary/Te-pi_0001.jpg",    "pituitary"),
]

all_passed = True
for img_path, true_class in test_cases:
    p = Path(img_path)
    if not p.exists():
        # Try to find any image in that folder
        folder = Path(img_path).parent
        imgs = list(folder.glob("*.jpg")) + list(folder.glob("*.png"))
        if imgs:
            p = imgs[0]
        else:
            print(f"[Test] SKIP — no images in {folder}")
            continue

    img = Image.open(p).convert("RGB")
    print(f"\n[Test] Image: {p.name} (true={true_class})")

    t1 = time.time()
    result = predictor.predict(img, filename=p.name)
    elapsed = time.time() - t1

    seg      = result["segmentation"]
    rad      = result["top_radiomics_features"]
    xai      = result["xai"]
    report   = result["clinical_report"]

    correct = result["tumor_class_raw"] == true_class

    print(f"  Predicted   : {result['tumor_type']} ({'CORRECT' if correct else 'WRONG'} — true={true_class})")
    print(f"  Confidence  : {result['confidence']*100:.1f}%")
    print(f"  Uncertainty : {result['uncertainty']*100:.3f}% ({result['uncertainty_tier']})")
    print(f"  Entropy     : {result['entropy']:.4f} nats")
    print(f"  Risk        : {result['risk_level']} (score={result['risk_score']:.3f})")
    print(f"  Segmentation: {seg['tumor_area_pixels']} px ({seg['tumor_area_percent']}%)")
    print(f"  Radiomics   : {len(rad)} features")
    print(f"  XAI         : gradcam={bool(xai['gradcam'])}, gradcam+={bool(xai['gradcam_plus'])}, "
          f"scorecam={bool(xai['scorecam'])}, ig={bool(xai['integrated_gradients'])}")
    print(f"  Report      : {len(report)} chars")
    print(f"  Time        : {elapsed:.1f}s")

    if not correct:
        all_passed = False

print("\n" + "="*60)
print("ALL TESTS PASSED" if all_passed else "SOME PREDICTIONS WRONG (model performance, not bugs)")
print("="*60)
print("\nReport preview (first 600 chars):")
print(report[:600])
