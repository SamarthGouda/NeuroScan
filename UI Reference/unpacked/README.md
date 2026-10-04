# NeuroVision — Intelligent Brain Tumor Detection & Classification

> **Production-grade medical AI system** using a CNN-ViT hybrid model with Monte Carlo Dropout uncertainty quantification, 4 XAI methods, Attention U-Net segmentation, radiomics extraction, risk stratification, and template-based clinical report generation.

---

## 🏗️ Project Structure

```
Brain Tumor Advanced/
├── backend/
│   ├── main.py                  # FastAPI entry point
│   ├── config.py                # All constants and paths
│   ├── database.py              # SQLAlchemy models
│   ├── models/
│   │   ├── hybrid_classifier.py # CNN-ViT dual-branch model
│   │   ├── attention_unet.py    # Attention U-Net segmentation
│   │   └── ensemble.py          # Ensemble wrapper
│   ├── training/
│   │   ├── train_classifier.py  # Trains 4 ablation variants
│   │   ├── train_segmentation.py
│   │   └── evaluate.py          # Full research metrics
│   ├── inference/
│   │   ├── predictor.py         # Main inference pipeline
│   │   ├── uncertainty.py       # Monte Carlo Dropout
│   │   └── risk_stratifier.py   # Risk scoring
│   ├── xai/
│   │   ├── xai_engine.py        # Grad-CAM, Grad-CAM++, Score-CAM, IG
│   │   └── xai_evaluator.py     # Pointing Game, Pixel Flipping
│   ├── radiomics/
│   │   └── radiomics_extractor.py
│   ├── report/
│   │   └── report_generator.py  # Pure Python template-based report
│   ├── api/
│   │   ├── routes_predict.py
│   │   ├── routes_history.py
│   │   └── routes_stats.py
│   └── requirements.txt
├── frontend/
│   └── src/                     # React 18 + Vite + Tailwind
├── dataset/
│   ├── Training/                # 4 class folders (→ 85% train / 15% val)
│   └── Testing/                 # Final test set (untouched)
├── saved_models/                # .pth checkpoints
├── Dockerfile
└── README.md
```

---

## ⚡ Quick Start

### 1. Install Python dependencies
```bash
pip install -r backend/requirements.txt
```

### 2. Train the classifier (all 4 ablation variants)
```bash
python backend/training/train_classifier.py
```
> ⏱️ ~45–90 min on GPU, ~3–4 hrs on CPU. Saves best model to `saved_models/hybrid_best.pth`.

### 3. Train the segmentation model
```bash
python backend/training/train_segmentation.py
```

### 4. Build the frontend
```bash
cd frontend && npm install && npm run build
```

### 5. Start the server
```bash
uvicorn backend.main:app --reload --port 8000
```

### 6. Open in browser
```
http://localhost:8000
```

---

## 🔬 Model Architecture

### Hybrid CNN-ViT Classifier
- **Branch A**: ResNet50 (pretrained ImageNet) → 2048-dim feature vector
- **Branch B**: Swin-Tiny (pretrained) → 768-dim feature vector  
- **Fusion**: Attention gate MLP learns scalar α weighting → 4-class output
- **Uncertainty**: MC Dropout (50 stochastic passes)

### Ablation Variants
| Variant | Description |
|---------|-------------|
| `resnet50_only` | CNN branch only (baseline) |
| `swin_only` | ViT branch only |
| `concat_no_attn` | CNN + ViT, simple concatenation |
| `hybrid` | Full CNN + ViT + attention gating (proposed) |

---

## 📊 API Endpoints

### Core Clinical & Ingestion Endpoints
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| `GET` | `/health` or `/api/health` | Public | System health check (Database, ML engine status, variant) |
| `POST` | `/api/auth/login` | Public | Staff & user authentication with rate-limiting |
| `POST` | `/api/auth/register` | Public | New account registration |
| `POST` | `/api/auth/logout` | Authenticated | Invalidate session |
| `GET` | `/api/auth/user` | Authenticated | Fetch current profile & role |
| `POST` | `/api/auth/otp/send` | Public | Generate & dispatch login/verification OTP |
| `POST` | `/api/auth/otp/verify` | Public | Verify OTP code |
| `GET` | `/api/auth/google/login` | Public | Google OAuth 2.0 authorization redirect |
| `POST` | `/api/scans/upload` | Doctor/Tech/Admin | Ingest MRI scan, run pipeline, create case & analysis |
| `GET` | `/api/scans` | Authenticated | List all ingested scans with patient summaries |
| `GET` | `/api/scans/{id}` | Authenticated | Comprehensive scan record, heatmaps & biomarkers |
| `POST` | `/api/scans/{id}/reports/generate` | Doctor/Admin | Generate clinical diagnostic report |
| `GET` | `/api/reports/{id}/download` | Authenticated | Download formatted clinical diagnostic report |
| `GET` | `/api/cases` | Authenticated | Clinical case registry & review board |
| `PUT` | `/api/cases/{id}` | Doctor/Admin | Update case status, triage priority, and doctor notes |
| `GET` | `/api/notifications` | Authenticated | Fetch alerts and triage notifications |
| `GET` | `/api/users` | Admin Only | Staff directory and account management |
| `GET` | `/api/audit` | Admin Only | Immutable security and regulatory audit log |
| `GET` | `/api/stats/ablation` | Authenticated | Research ablation study metrics and models |

Interactive Swagger / OpenAPI docs: `http://localhost:8000/docs`

---

## 🧠 XAI Methods

1. **Grad-CAM** — Gradient-weighted Class Activation Maps
2. **Grad-CAM++** — Improved localization with 2nd-order gradients
3. **Score-CAM** — Gradient-free, perturbation-based CAM
4. **Integrated Gradients** — Axiomatic attribution via baseline integration

Faithfulness evaluated via:
- **Pointing Game** — Does argmax(heatmap) fall inside the segmentation mask?
- **Pixel Flipping** — Energy retained after masking top-k% pixels

---

## ⚕️ Clinical Report

Reports are generated by a **pure Python template-based engine** with:
- Per-tumor-type clinical narrative (glioma, meningioma, pituitary, no tumor)
- Confidence and uncertainty phrasing
- Risk narrative and recommendations
- Radiomics insights
- Segmentation area description
- Clinical disclaimer

**No external API calls. No LLM. No API keys required.**

---

## 🔒 Security & Compliance

- **Authentication**: Salted password hashing (Argon2 / PBKDF2), signed JWT tokens, role-based access control.
- **Strict Guarding**: Unauthenticated requests to protected endpoints return clean `401 Unauthorized` JSON. Non-existent API paths return `404 Not Found` JSON (never falling back to HTML).
- **Security Headers**: Automatic headers applied: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Strict-Transport-Security` in production.
- **Audit Logging**: Every login, scan upload, inference execution, case modification, and report generation is captured in an append-only audit trail with IP address and timestamp.
- **Input Validation**: Medical upload validation enforcing MIME signature (magic bytes), file extension whitelist, and size quotas.

---

## 🐳 Production Deployment & Docker

### 1. Environment Configuration
Copy `.env.example` to `.env` and configure your production secrets:
```bash
cp .env.example .env
```

### 2. Run with Docker Compose
```bash
# Standard deployment (Application + SQLite + ML Pipeline):
docker compose up -d --build

# High-concurrency production deployment (Application + PostgreSQL):
docker compose --profile with-postgres up -d --build
```

### 3. Verify Health
```bash
curl http://localhost:8000/health
```

### 4. Run E2E Verification Test Suite
```bash
python test_e2e_full.py
```

---

## ⚠️ Disclaimer

NeuroVision is a **clinical decision support and research tool** intended for academic, exploratory, and clinical assistance workflows. All AI outputs, segmentations, and reports must be reviewed and validated by board-certified radiologists before initiating clinical treatment.

