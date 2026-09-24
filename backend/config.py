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

# ─── Environment & Security ──────────────────────────────────────────────────
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
IS_PRODUCTION = ENVIRONMENT == "production"

AUTH_SECRET = os.getenv(
    "NEUROSCAN_AUTH_SECRET",
    os.getenv("JWT_SECRET", "neuroscan_ai_clinical_secure_token_secret_2026_key")
)
TOKEN_EXPIRY_SECONDS = int(os.getenv("TOKEN_EXPIRY_SECONDS", str(86400 * 7)))  # 7 days

# ─── Database ────────────────────────────────────────────────────────────────
DB_PATH = BASE_DIR / "neurovision.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

# ─── Google OAuth Configuration ──────────────────────────────────────────────
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")

# ─── SMTP / Email OTP Configuration ─────────────────────────────────────────
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "noreply@neurovision.ai")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")

# ─── File Upload Limits ──────────────────────────────────────────────────────
MAX_UPLOAD_SIZE_BYTES = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", str(25 * 1024 * 1024))) # 25 MB
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}

# ─── CORS ────────────────────────────────────────────────────────────────────
_cors_env = os.getenv("CORS_ORIGINS", "")
if _cors_env:
    CORS_ORIGINS = [origin.strip() for origin in _cors_env.split(",") if origin.strip()]
else:
    CORS_ORIGINS = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
    ]

