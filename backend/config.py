"""
NeuroVision Configuration
All constants, paths, and hyperparameters in one place.
"""
import os
from pathlib import Path

# ─── Project Paths ──────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent  # Brain Tumor Advanced/
DATA_ROOT = BASE_DIR / "dataset"
TRAIN_DIR = DATA_ROOT / "Training"
TEST_DIR = DATA_ROOT / "Testing"
MODEL_SAVE_PATH = BASE_DIR / "saved_models"
MODEL_SAVE_PATH.mkdir(exist_ok=True)

# ─── Dataset / Classes ──────────────────────────────────────────────────────
CLASS_NAMES = ["glioma", "meningioma", "notumor", "pituitary"]
CLASS_DISPLAY = {
    "glioma":     "Glioma",
    "meningioma": "Meningioma",
    "notumor":    "No Tumor",
    "pituitary":  "Pituitary Tumor",
}
NUM_CLASSES = 4

# ─── Training Hyperparameters ────────────────────────────────────────────────
IMG_SIZE = 224
BATCH_SIZE = 16
NUM_EPOCHS = 10
LEARNING_RATE = 1e-4
WEIGHT_DECAY = 1e-4
EARLY_STOP_PATIENCE = 10
VAL_SPLIT = 0.15          # 15% of Training/ becomes validation
SEED = 42

# ─── Uncertainty Quantification ─────────────────────────────────────────────
MC_DROPOUT_PASSES = 50
UNCERTAINTY_LOW  = 0.05   # std < this → LOW
UNCERTAINTY_HIGH = 0.15   # std > this → HIGH

# ─── Risk Stratification ────────────────────────────────────────────────────
RISK_WEIGHTS = {
    "glioma":     0.9,
    "meningioma": 0.6,
    "pituitary":  0.5,
    "notumor":    0.05,
}

# ─── XAI ────────────────────────────────────────────────────────────────────
IG_N_STEPS = 50
XAI_ALPHA = 0.4   # heatmap blend weight

# ─── Normalization ───────────────────────────────────────────────────────────
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]

# ─── Database ────────────────────────────────────────────────────────────────
DB_PATH = BASE_DIR / "neurovision.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

# ─── API ─────────────────────────────────────────────────────────────────────
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000",
]
