# NeuroVision (NeuroScan AI) — Complete File Inventory & Codebase Audit

> **Audit Date:** Current System State  
> **Inspection Scope:** Recursive evaluation of all project directories (`backend/`, `frontend/`, `saved_models/`, `dataset/`, root configs).  
> **Classification Key:**
> - `[ESSENTIAL]`: Mandatory for runtime execution, model inference, database operations, or client presentation.
> - `[SUPPORTING]`: Auxiliary utility, helper service, evaluation script, or development convenience tool.
> - `[GENERATED / ARTIFACT]`: Build output, compiled assets, serialized weights, or SQLite database.
> - `[OBSOLETE / LEGACY]`: Superseded by newer architecture, unreferenced in startup graph, or dead code.
> - `[UNCERTAIN]`: Secondary backup or unmounted file requiring explicit verification.

---

## 1. High-Level Codebase Breakdown

```
Brain Tumor Advanced/
├── .env.example                     [SUPPORTING]  Environment template
├── Dockerfile                       [SUPPORTING]  Multi-stage production container build
├── docker-compose.yml               [SUPPORTING]  Container orchestration (App + Postgres profile)
├── README.md                        [SUPPORTING]  Project documentation & quick-start guide
├── start_server.bat                 [SUPPORTING]  Windows local startup script
├── test_e2e_full.py                 [SUPPORTING]  Full E2E automated verification test suite
├── test_pipeline.py                 [SUPPORTING]  CLI model inference verification script
├── run_pipeline.py                  [SUPPORTING]  Training orchestration runner script
├── test_result.json                 [GENERATED]   Saved sample inference response JSON
├── neurovision.db                   [GENERATED]   Active SQLite relational database (6.6 MB)
│
├── backend/
│   ├── main.py                      [ESSENTIAL]   FastAPI application entry point & SPA router
│   ├── config.py                    [ESSENTIAL]   Global configuration constants & paths
│   ├── database.py                  [ESSENTIAL]   SQLAlchemy ORM models, session & role seeders
│   ├── auth.py                      [ESSENTIAL]   PBKDF2 hashing, signed JWT tokens & RBAC guards
│   ├── email_service.py             [SUPPORTING]  SMTP transactional email & OTP service
│   ├── requirements.txt             [ESSENTIAL]   Python dependency manifest
│   ├── neuroscan.db                 [OBSOLETE]    0-byte placeholder database file
│   │
│   ├── api/
│   │   ├── routes_auth.py           [ESSENTIAL]   Authentication, OTP, OAuth & password management
│   │   ├── routes_scans.py          [ESSENTIAL]   MRI ingestion, validation, analysis & pipeline trigger
│   │   ├── routes_cases.py          [ESSENTIAL]   Clinical case tracking, prioritization & doctor notes
│   │   ├── routes_reports.py        [ESSENTIAL]   Radiology report generation & download
│   │   ├── routes_users.py          [ESSENTIAL]   Staff directory & administrator user management
│   │   ├── routes_patients.py       [ESSENTIAL]   Patient registration & history lookups
│   │   ├── routes_stats.py          [ESSENTIAL]   Dashboard metrics, SQL aggregations & ablation stats
│   │   ├── routes_audit.py          [ESSENTIAL]   Immutable regulatory security audit trail API
│   │   ├── routes_notifications.py  [ESSENTIAL]   In-app alerts & role-based notification dispatch
│   │   ├── routes_predict.py        [SUPPORTING]  Direct single-shot prediction route (no case wrap)
│   │   └── routes_history.py        [OBSOLETE]    Legacy unmounted router referencing defunct model
│   │
│   ├── models/
│   │   ├── hybrid_classifier.py     [ESSENTIAL]   ResNet-50 + Swin-Tiny attention-gated hybrid classifier
│   │   ├── attention_unet.py        [ESSENTIAL]   ResNet-34 encoder Attention U-Net segmentation
│   │   └── ensemble.py              [SUPPORTING]  Soft-voting probability ensemble wrapper
│   │
│   ├── inference/
│   │   ├── predictor.py             [ESSENTIAL]   Full inference orchestration pipeline
│   │   ├── uncertainty.py           [ESSENTIAL]   Monte Carlo Dropout & Shannon entropy engine
│   │   └── risk_stratifier.py       [ESSENTIAL]   Weighted clinical composite risk scoring
│   │
│   ├── radiomics/
│   │   └── radiomics_extractor.py   [ESSENTIAL]   First-order, GLCM texture & SHAP feature extractor
│   │
│   ├── report/
│   │   └── report_generator.py      [ESSENTIAL]   Clinician-grade rule-based report template engine
│   │
│   ├── training/
│   │   ├── train_classifier.py      [SUPPORTING]  Trains 4 ablation classifier variants
│   │   ├── train_segmentation.py    [SUPPORTING]  Generates pseudo-masks & trains Attention U-Net
│   │   └── evaluate.py              [SUPPORTING]  Computes research metrics (ROC, PR, ECE, DeLong)
│   │
│   └── xai/
│       ├── xai_engine.py            [ESSENTIAL]   Grad-CAM, Grad-CAM++, Score-CAM & Integrated Gradients
│       └── xai_evaluator.py         [ESSENTIAL]   Pointing Game & Pixel Flipping faithfulness metrics
│
├── frontend/
│   ├── package.json                 [ESSENTIAL]   Node.js dependencies & build scripts
│   ├── vite.config.ts               [ESSENTIAL]   Vite build tooling configuration
│   ├── tailwind.config.ts           [ESSENTIAL]   Tailwind CSS design token system
│   ├── tsconfig.json                [ESSENTIAL]   TypeScript compiler configuration
│   ├── index.html                   [ESSENTIAL]   SPA HTML shell
│   │
│   └── src/
│       ├── main.tsx                 [ESSENTIAL]   React DOM client bootstrap
│       ├── App.tsx                  [ESSENTIAL]   Root component, routing & sidebar layout
│       ├── index.css                [ESSENTIAL]   Global CSS styling, animations & theme tokens
│       │
│       ├── pages/
│       │   ├── landing.tsx          [ESSENTIAL]   Public marketing landing page
│       │   ├── login.tsx            [ESSENTIAL]   Authentication UI (Password, OTP & Google)
│       │   ├── doctor-dashboard.tsx [ESSENTIAL]   Physician overview, active cases & risk queue
│       │   ├── technician-dashboard.tsx [ESSENTIAL] MRI ingestion, acquisition status & quick stats
│       │   ├── dashboard.tsx        [ESSENTIAL]   Administrator overview & system telemetry
│       │   ├── upload.tsx           [ESSENTIAL]   Medical scan upload wizard & validation
│       │   ├── scan-analysis.tsx    [ESSENTIAL]   Primary clinical analysis & XAI viewing console
│       │   ├── cases.tsx            [ESSENTIAL]   Clinical case registry & review board
│       │   ├── report-page.tsx      [ESSENTIAL]   Formatted diagnostic report presentation view
│       │   ├── reports.tsx          [ESSENTIAL]   Diagnostic report catalog
│       │   ├── users.tsx            [ESSENTIAL]   Staff directory & RBAC management
│       │   ├── audit-logs.tsx       [ESSENTIAL]   Regulatory audit log viewer & filter
│       │   ├── statistics.tsx       [ESSENTIAL]   Research metrics, ablation charts & ROC curves
│       │   ├── settings.tsx         [ESSENTIAL]   User profile, session security & preferences
│       │   └── not-found.tsx        [ESSENTIAL]   404 fallback page
│       │
│       ├── components/              [ESSENTIAL]   MRI viewer, 3D brain, confusion matrix, UI widgets
│       ├── hooks/                   [ESSENTIAL]   useAuth, useToast, useMobile
│       └── lib/                     [ESSENTIAL]   QueryClient, authUtils, pdfGenerator
│
├── saved_models/                    [GENERATED]   Trained PyTorch checkpoints (.pth) & ablation JSON
└── dataset/                         [SUPPORTING]  MRI dataset (Training/ and Testing/ folders)
```

---

## 2. Granular Inventory Table of All Code & Config Files

### 2.1 Root & Configuration Files

| Relative Path | Tech / Type | Purpose | Primary Exports / Symbols | Upstream Dependencies | Downstream Dependents | Classification | Security / Reliability Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `.env.example` | Config / Env | Template for application environment variables | `ENVIRONMENT`, `NEUROSCAN_AUTH_SECRET`, `DATABASE_URL` | None | Copied to `.env` | `[SUPPORTING]` | Never commit real secrets. Contains guidance on generating 32-byte hex keys. |
| `Dockerfile` | Container / Docker | Multi-stage Docker build file | Stage 1 (Node builder), Stage 2 (Python runner) | `node:20-alpine`, `python:3.10-slim` | `docker-compose.yml` | `[SUPPORTING]` | Installs `libgl1-mesa-glx` for OpenCV. Copies built frontend to `/frontend/dist`. |
| `docker-compose.yml`| Container / Compose| Multi-container orchestration | `neurovision-app`, `postgres-db` (profile) | `Dockerfile`, `postgres:15-alpine` | Deployment | `[SUPPORTING]` | Includes health check probing `/health` every 30s. Exposes 8000 and 5432. |
| `README.md` | Docs / Markdown | Project documentation, setup guide and specs | Architecture diagrams, quick start, API specs | Source files | Developer onboarding | `[SUPPORTING]` | Accurate reflection of codebase, API routes, and model ablation metrics. |
| `start_server.bat` | Script / Batch | Windows one-click local server startup script | Starts `uvicorn backend.main:app` | Python, Uvicorn | Local developers | `[SUPPORTING]` | Runs with `--reload` flag. Safe for development use. |
| `run_pipeline.py` | Script / Python | Training pipeline runner | `train_seg()`, `run_eval()` | `train_segmentation`, `evaluate` | Model training | `[SUPPORTING]` | Orchestrates sequential execution of segmentation training and evaluation. |
| `test_pipeline.py` | Test / Python | Smoke test for ML predictor across 4 classes | Loads `NeuroVisionPredictor`, tests 4 sample images | `PIL`, `NeuroVisionPredictor` | Quality Assurance | `[SUPPORTING]` | Validates confidence, uncertainty, segmentation, radiomics, and XAI generation. |
| `test_e2e_full.py` | Test / Python | End-to-end integration and security test suite | `run_tests()`, 8 comprehensive test stages | `requests`, running server | CI/CD verification | `[SUPPORTING]` | Validates health, auth guards, doctor upload, report gen, RBAC 403s, and audit trail. |
| `test_result.json` | Data / JSON | Pre-generated serialized ML output sample | Full JSON response with Base64 heatmaps | `predictor.py` | Test verification | `[GENERATED]` | 336 KB file containing sample inference output. Contains no user PII. |
| `neurovision.db` | Data / SQLite | Active production/development SQLite database | 9 relational tables, 23 scans, 8 users, 99 logs | SQLite engine | `database.py` | `[GENERATED]` | 6.6 MB database file. Contains real test data and pre-seeded default staff accounts. |

---

### 2.2 Backend Core & Infrastructure Files (`backend/`)

| Relative Path | Tech / Type | Purpose | Primary Exports / Symbols | Upstream Dependencies | Downstream Dependents | Classification | Security / Reliability Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `backend/main.py` | Python / FastAPI | Application entry point, lifespan, security headers & routing | `app`, `lifespan()`, `health_check()`, `serve_spa_or_api_guard()` | `fastapi`, `database`, `config`, all route modules | Server execution | `[ESSENTIAL]` | Injects HTTP security headers (`nosniff`, `DENY`). Strict API 404 guard prevents HTML fallback on `/api/*`. |
| `backend/config.py` | Python / Config | Centralized configuration, hyperparams, and environment loading | `BASE_DIR`, `DATABASE_URL`, `AUTH_SECRET`, `CLASS_NAMES`, `RISK_WEIGHTS` | `os`, `pathlib` | All backend modules | `[ESSENTIAL]` | Reads from environment with safe fallback defaults. Enforces 25 MB max upload quota. |
| `backend/database.py` | Python / SQLAlchemy| Relational database models, session factory & seeders | `User`, `Patient`, `Scan`, `Analysis`, `Case`, `DiagnosticReport`, `AuditLog`, `create_tables()` | `sqlalchemy`, `config` | `auth.py`, all route modules | `[ESSENTIAL]` | Implements 9 tables with foreign keys and UUID primary keys. Seeds 3 default staff accounts on startup. |
| `backend/auth.py` | Python / Security | Cryptographic hashing, token signing, RBAC dependencies & auditing | `hash_password()`, `verify_password()`, `create_token()`, `get_current_user()`, `require_role()` | `hashlib`, `hmac`, `fastapi`, `database` | `routes_auth.py`, protected routes | `[ESSENTIAL]` | PBKDF2-HMAC-SHA256 with 100,000 iterations. Timing-attack safe comparisons (`hmac.compare_digest`). |
| `backend/email_service.py`| Python / SMTP | Transactional email & OTP delivery | `send_otp_email()`, `is_smtp_configured()` | `smtplib`, `email.mime`, `config` | `routes_auth.py` | `[SUPPORTING]` | Secure fallback: if SMTP is unconfigured, logs OTP to console without crashing or throwing exceptions. |
| `backend/requirements.txt`| Manifest / Pip | Python dependency specifications | `torch`, `torchvision`, `timm`, `fastapi`, `sqlalchemy`, `captum`, `xgboost` | PyPI | Deployment / Pip | `[ESSENTIAL]` | Pinned to major stable versions. Includes headless OpenCV to prevent GUI dependency issues in Docker. |
| `backend/neuroscan.db` | Data / SQLite | Empty legacy SQLite database placeholder | 0 bytes | None | None | `[OBSOLETE]` | **Dead file.** Root `neurovision.db` is the actual database used by `config.py`. Should be archived. |

---

### 2.3 Backend API Routers (`backend/api/`)

| Relative Path | Tech / Type | Purpose | Primary Exports / Symbols | Upstream Dependencies | Downstream Dependents | Classification | Security / Reliability Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `backend/api/routes_auth.py` | Python / FastAPI | User authentication, OTP verification, password change & Google OAuth | `router`, `login()`, `register()`, `send_otp()`, `google_callback()` | `auth.py`, `database.py`, `httpx` | `backend/main.py` | `[ESSENTIAL]` | Enforces IP rate limiting on login/register. Sanitizes input via Pydantic. Sets `HttpOnly` session cookies. |
| `backend/api/routes_scans.py` | Python / FastAPI | Primary MRI ingestion, security validation, pipeline trigger & cases | `router`, `upload_and_analyze_scan()`, `list_scans()`, `validate_image_security()` | `PIL`, `database.py`, `predictor.py` | `backend/main.py` | `[ESSENTIAL]` | Inspects magic bytes (`\xff\xd8\xff`, `\x89PNG`), validates file size (<25MB), auto-generates cases and reports. |
| `backend/api/routes_cases.py` | Python / FastAPI | Clinical case review, status workflow, prioritization & doctor notes | `router`, `list_cases()`, `get_case()`, `update_case()` | `database.py`, `auth.py` | `backend/main.py` | `[ESSENTIAL]` | Allows status transitions (`active` -> `under_review` -> `completed`). Logs every update to audit trail. |
| `backend/api/routes_reports.py`| Python / FastAPI | Radiology diagnostic report generation & plain-text downloads | `router`, `generate_report_for_scan()`, `download_report()` | `report_generator.py`, `database.py` | `backend/main.py` | `[ESSENTIAL]` | Generates versioned reports (`v1`, `v2`). Enforces mandatory clinical disclaimers in all downloads. |
| `backend/api/routes_users.py` | Python / FastAPI | Administrator staff account directory, creation & deactivation | `router`, `list_users()`, `create_user()`, `update_user()`, `toggle_user_active()` | `auth.require_role(["admin"])` | `backend/main.py` | `[ESSENTIAL]` | Strictly locked to `admin` role. Prevents administrators from deactivating their own accounts. |
| `backend/api/routes_patients.py`| Python / FastAPI | Patient record management, demographics & scan history lookups | `router`, `list_patients()`, `create_patient()`, `get_patient()` | `database.py`, `auth.py` | `backend/main.py` | `[ESSENTIAL]` | Enforces sequential, collision-proof patient IDs (`PT-2026-XXXX`). |
| `backend/api/routes_stats.py` | Python / FastAPI | Live database statistics, aggregations, ablation stats & calibration | `router`, `get_dashboard_stats()`, `get_ablation()`, `get_roc()`, `get_calibration()` | `sqlalchemy.func`, `database.py` | `backend/main.py` | `[ESSENTIAL]` | Uses optimized SQL aggregate functions (`COUNT`, `AVG`). Parses `ablation_summary.json` for research data. |
| `backend/api/routes_audit.py` | Python / FastAPI | Regulatory audit trail inspection, keyword search & role filtering | `router`, `get_audit_logs()`, `_format_log()` | `auth.require_role(["admin"])` | `backend/main.py` | `[ESSENTIAL]` | Strictly restricted to `admin` role. Supports pagination (`limit`, `offset`) and ILIKE search filters. |
| `backend/api/routes_notifications.py`| Python / FastAPI | Real-time clinical notifications, unread counts & mark-as-read | `router`, `get_notifications()`, `mark_notification_read()`, `mark_all_read()` | `database.Notification`, `auth.py` | `backend/main.py` | `[ESSENTIAL]` | Filters notifications by specific user ID, target clinical role, or global broadcast. |
| `backend/api/routes_predict.py` | Python / FastAPI | Direct single-shot image inference without case/report workflow | `router`, `predict()` | `predictor.py`, `database.py` | `backend/main.py` | `[SUPPORTING]` | Fast API endpoint for quick exploratory screening. Auto-links scan and analysis records. |
| `backend/api/routes_history.py` | Python / FastAPI | Legacy prediction history router | `router`, `get_history()` | `database.Prediction` (DEFUNCT) | **None (Unmounted)** | `[OBSOLETE]` | **Defunct router.** References non-existent `Prediction` model (replaced by `Analysis`). Not imported in `main.py`. |

---

### 2.4 Deep Learning & Inference Engine (`backend/models/`, `backend/inference/`, etc.)

| Relative Path | Tech / Type | Purpose | Primary Exports / Symbols | Upstream Dependencies | Downstream Dependents | Classification | Security / Reliability Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `backend/models/hybrid_classifier.py` | Python / PyTorch | ResNet-50 + Swin-Tiny dual-branch hybrid classifier & ablations | `HybridClassifier`, `AttentionFusion`, `CNNOnlyClassifier`, `ViTOnlyClassifier` | `torch`, `torchvision`, `timm` | `predictor.py`, `train_classifier.py` | `[ESSENTIAL]` | Learnable $\alpha$ gate dynamically balances CNN and ViT. MC Dropout (p=0.3) embedded in classification head. |
| `backend/models/attention_unet.py` | Python / PyTorch | Attention U-Net tumor segmentation model | `AttentionUNet`, `AttentionGate`, `DiceBCELoss` | `torch`, `torchvision.models` | `predictor.py`, `train_segmentation.py`| `[ESSENTIAL]` | Uses ResNet-34 encoder. Additive attention gates filter skip-connections before concatenation. |
| `backend/models/ensemble.py` | Python / PyTorch | Soft-voting probability ensemble wrapper | `EnsembleModel.predict()` | `torch`, `torch.nn.functional` | Experimental / Research | `[SUPPORTING]` | Averages softmax probability distributions across arbitrary lists of PyTorch classifiers. |
| `backend/inference/predictor.py` | Python / Pipeline| Orchestrates classification, uncertainty, XAI, segmentation & report | `NeuroVisionPredictor.predict()` | All sub-engines, PyTorch | `routes_scans.py`, `routes_predict.py` | `[ESSENTIAL]` | Automatically picks the best performing ablation variant (`_pick_best_model`). Thread-safe evaluation mode. |
| `backend/inference/uncertainty.py` | Python / Bayesian| 50-pass Monte Carlo Dropout uncertainty & Shannon entropy | `MCDropoutPredictor.predict_with_uncertainty()` | `torch`, `numpy` | `predictor.py` | `[ESSENTIAL]` | Dynamically forces `Dropout` layers to remain active during inference (`m.train()`) to compute $\sigma$ and entropy. |
| `backend/inference/risk_stratifier.py` | Python / Logic | Composite risk scoring engine | `compute_risk_score()` | `config.RISK_WEIGHTS` | `predictor.py` | `[ESSENTIAL]` | Weighted formula combines base pathology risk (0.5), tumor area (0.3), and uncertainty penalty (0.2). |
| `backend/radiomics/radiomics_extractor.py`| Python / NumPy | Quantitative texture & shape biomarker extraction with SHAP | `RadiomicsExtractor`, `_extract_glcm()`, `_extract_shape()` | `numpy`, `scipy`, `skimage`, `xgboost`, `shap` | `predictor.py` | `[ESSENTIAL]` | Pure NumPy/SciPy/skimage implementation. Fully compatible with Python 3.10-3.13 without C++ pyradiomics dependency. |
| `backend/report/report_generator.py` | Python / Templates | Pure Python clinical radiology report generation | `generate_clinical_report()` | Standard library only | `predictor.py`, `routes_reports.py` | `[ESSENTIAL]` | Zero external LLM calls. Deterministic, clinical-grade narrative construction with mandatory legal disclaimers. |
| `backend/xai/xai_engine.py` | Python / Captum | Generates Grad-CAM, Grad-CAM++, Score-CAM, & Integrated Gradients | `XAIEngine.generate_all()` | `pytorch_grad_cam`, `captum`, `cv2` | `predictor.py` | `[ESSENTIAL]` | Captures target convolutional gradients from ResNet `layer4`. Integrated Gradients uses Gaussian noise baselines. |
| `backend/xai/xai_evaluator.py` | Python / Metrics| Evaluates XAI faithfulness via Pointing Game & Pixel Flipping | `XAIEvaluator.evaluate()` | `numpy`, `cv2` | `predictor.py` | `[ESSENTIAL]` | Checks if heatmap peak falls inside segmentation mask; tracks attribution energy retention across top-k% pixel masking. |
| `backend/training/train_classifier.py` | Python / PyTorch| Trains all 4 ablation variants sequentially | `main()`, `train_one_epoch()`, `evaluate_loader()` | `torch`, `torchvision`, `sklearn` | Training workflow | `[SUPPORTING]` | Implements stratified 85/15 train-val split, Cosine Annealing learning rate schedule, and Label Smoothing loss. |
| `backend/training/train_segmentation.py`| Python / PyTorch| Generates Otsu pseudo-masks & trains Attention U-Net | `main()`, `generate_pseudo_masks()` | `torch`, `cv2`, `PIL` | Training workflow | `[SUPPORTING]` | Fast pseudo-mask generation using Otsu thresholding + elliptical center priors. Uses combined Dice + BCE loss. |
| `backend/training/evaluate.py` | Python / Research| Full test set evaluation suite producing publication-ready metrics | `main()`, `get_predictions()`, `compute_metrics()` | `sklearn.metrics`, `scipy.stats` | Training workflow | `[SUPPORTING]` | Computes per-class ROC, Precision-Recall, Expected Calibration Error (ECE), McNemar's test, and DeLong's test. |

---

### 2.5 Frontend Presentation Tier (`frontend/`)

| Relative Path | Tech / Type | Purpose | Primary Exports / Symbols | Upstream Dependencies | Downstream Dependents | Classification | Security / Reliability Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `frontend/src/App.tsx` | TSX / React | Root component, SPA routing, navigation bar & user menu | `App`, `MainRouter`, `DashboardDispatcher`, `PublicRouter` | `wouter`, `useAuth`, Radix UI | `main.tsx` | `[ESSENTIAL]` | Role-aware route dispatcher. Unauthenticated users are redirected to Landing or Login. |
| `frontend/src/hooks/useAuth.ts` | TS / React Query| Authentication context, login/logout mutations & role helpers | `useAuth()`, `login()`, `logout()`, `isDoctor`, `isAdmin` | `@tanstack/react-query`, API | All pages & headers | `[ESSENTIAL]` | Manages session state via `/api/auth/user`. Automatically invalidates user and stats query caches on login/logout. |
| `frontend/shared/schema.ts` | TS / Interfaces | TypeScript data contracts matching backend entities | `User`, `Patient`, `Scan`, `AnalysisData`, `Case`, `DiagnosticReport` | None | All frontend components | `[ESSENTIAL]` | Ensures full type safety across API boundaries. Prevents runtime schema mismatch bugs. |
| `frontend/src/pages/scan-analysis.tsx`| TSX / React | Core clinical diagnostic workstation view | `ScanAnalysis` component | `MRIViewer`, `useQuery`, `useMutation` | `App.tsx` | `[ESSENTIAL]` | Multi-tab analysis console: overlays, XAI heatmaps, radiomics bar charts, faithfulness metrics, and report triggers. |
| `frontend/src/components/mri-viewer.tsx`| TSX / React | Interactive medical image viewer with zoom, pan & contrast | `MRIViewer` component | `lucide-react`, `Slider`, Canvas | `scan-analysis.tsx` | `[ESSENTIAL]` | Supports real-time brightness/contrast adjustments, measurement rulers, and alpha-blended heatmap overlays. |
| `frontend/src/components/brain-visualization.tsx`| TSX / Three.js | Real-time 3D interactive anatomical brain model | `BrainVisualization`, `AnatomicalBrainModel` | `@react-three/fiber`, `@react-three/drei`, `three`| Landing & Dashboards | `[ESSENTIAL]` | Loads genuine anatomical 3D brain mesh (`brain.glb`) with sweeping laser MRI slices and rotating point clouds. |
| `frontend/src/pages/doctor-dashboard.tsx`| TSX / React | Physician triage dashboard & high-risk scan queue | `DoctorDashboard` component | `useQuery`, Radix UI, Lucide | `App.tsx` | `[ESSENTIAL]` | Highlights urgent high-risk cases, shows recent patient scans, and provides one-click navigation to full analysis. |
| `frontend/src/pages/technician-dashboard.tsx`| TSX / React | MRI technologist upload & scan ingestion workstation | `TechnicianDashboard` component | `useQuery`, Radix UI | `App.tsx` | `[ESSENTIAL]` | Tailored for MRI acquisition staff: quick scan uploads, equipment status indicators, and recent upload histories. |
| `frontend/src/pages/dashboard.tsx` | TSX / React | Hospital administrator dashboard & system telemetry | `AdminDashboard` component | `useQuery`, Recharts | `App.tsx` | `[ESSENTIAL]` | Displays total scans, active staff counts, tumor pathology distributions, and system-wide audit activity feeds. |
| `frontend/src/pages/cases.tsx` | TSX / React | Clinical case management registry & triage review board | `CasesPage` component | `useQuery`, `useMutation` | `App.tsx` | `[ESSENTIAL]` | Case status filtering (`active`, `under_review`, `completed`), priority badges, and doctor assignment dialogs. |
| `frontend/src/pages/audit-logs.tsx` | TSX / React | Immutable security audit trail viewer | `AuditLogsPage` component | `useQuery`, Radix UI | `App.tsx` | `[ESSENTIAL]` | Administrative viewer with live search across actions (`LOGIN`, `UPLOAD_SCAN`, etc.), IP addresses, and user roles. |
| `frontend/src/pages/users.tsx` | TSX / React | Staff directory & account provisioning console | `UsersPage` component | `useQuery`, `useMutation` | `App.tsx` | `[ESSENTIAL]` | Admin-only staff account creation, role modification (`doctor`, `technician`, `admin`), and account deactivation. |
| `frontend/src/pages/statistics.tsx`| TSX / React | Research metrics, ROC curves & ablation comparisons | `StatisticsPage` component | `Recharts`, `useQuery` | `App.tsx` | `[ESSENTIAL]` | Renders ROC curves, precision-recall graphs, confusion matrices, and ablation study comparison tables. |
| `frontend/src/pages/report-page.tsx`| TSX / React | Full clinical radiology report viewing & printing view | `ReportPage` component | `useQuery`, `lucide-react` | `App.tsx` | `[ESSENTIAL]` | Formatted clinical document presentation with one-click TXT download and browser print styling. |

---

## 3. Identification of Suspicious, Dead, or Obsolete Code

During this exhaustive repository audit, three specific architectural anomalies and obsolete artifacts were detected:

1. **Dead Legacy Router: `backend/api/routes_history.py` `[OBSOLETE]`**
   - **Evidence:** Line 11 imports `from database import get_db, Prediction, AuditLog`.
   - **Finding:** The entity `Prediction` no longer exists in `backend/database.py`; it was refactored into the normalized `Scan` and `Analysis` relational models.
   - **Impact:** If `routes_history.py` were ever imported into `backend/main.py`, the server would crash with an `ImportError`. Fortunately, `main.py` does **not** import or mount this router. It is completely dead code that should be deleted in future refactoring.
2. **Duplicate Empty Database: `backend/neuroscan.db` `[OBSOLETE]`**
   - **Evidence:** File size is 0 bytes (`backend/neuroscan.db`).
   - **Finding:** The application configuration (`backend/config.py:68-69`) explicitly points to `BASE_DIR / "neurovision.db"` (located in the project root, size 6.6 MB).
   - **Impact:** Zero runtime impact, but causes developer confusion. Should be removed.
3. **Legacy Backup Folder: `_backup_neuroscan/` `[UNCERTAIN]`**
   - **Evidence:** Contains unreferenced older versions of `inference/`, `models/`, `radiomics/`, `report/`, and `routes_predict.py`.
   - **Finding:** This is an unversioned manual snapshot created before the unified architecture refactoring.
   - **Recommendation:** Can be safely ignored or moved to a dedicated archive branch.
