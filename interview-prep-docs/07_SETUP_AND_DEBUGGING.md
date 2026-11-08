# NeuroVision (NeuroScan AI) — Setup, Execution & Debugging Guide

> **Verified Platform Guide:** Windows 10/11 & Linux / Docker Compose  
> **Target Audience:** Systems Engineers, DevOps, and Technical Interviewers verifying deployment competency.

---

## 1. Prerequisites

Ensure the host environment meets the following software specifications:
- **Operating System:** Windows 10/11 (64-bit), Ubuntu 20.04/22.04 LTS, or macOS.
- **Python:** Python 3.10.x or 3.11.x (Python 3.12+ compatible; 3.10 recommended for PyTorch CUDA).
- **Node.js:** Node.js v18.x or v20.x LTS with `npm` v9+.
- **Git:** Git 2.30+ for version control.
- **Hardware Requirements:**
  - Minimum: 8 GB RAM, 4 CPU cores, 10 GB free disk space.
  - Recommended: 16 GB RAM, NVIDIA GPU with 6+ GB VRAM (CUDA 11.8+ or 12.1+).

---

## 2. Environment Configuration

### 2.1 Copy Environment Template
In the project root, duplicate `.env.example` to create `.env`:
```bash
# Windows PowerShell
Copy-Item .env.example .env

# Linux / macOS
cp .env.example .env
```

### 2.2 Configure Environment Variables
Open `.env` in an editor. Configure safe values as outlined below:

```ini
# ==============================================================================
# NEUROVISION AI — Environment Configuration (.env)
# ==============================================================================

ENVIRONMENT=development
PORT=8000
HOST=0.0.0.0

# ─── Security & Tokens ────────────────────────────────────────────────────────
# Generate a secure key: python -c "import secrets; print(secrets.token_hex(32))"
NEUROSCAN_AUTH_SECRET=9f8e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0
JWT_SECRET=9f8e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0
TOKEN_EXPIRY_SECONDS=604800

# ─── Database ─────────────────────────────────────────────────────────────────
# SQLite (Local Development Default):
DATABASE_URL=sqlite:///./neurovision.db

# PostgreSQL (Docker Production Profile):
# DATABASE_URL=postgresql://neurovision:neurovision_secure_password@localhost:5432/neurovision_db

# ─── CORS Allowed Origins ─────────────────────────────────────────────────────
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:8000,http://127.0.0.1:5173,http://127.0.0.1:8000

# ─── File Quota ───────────────────────────────────────────────────────────────
MAX_UPLOAD_SIZE_BYTES=26214400

# ─── Optional Services (Leave blank for dev mock mode) ────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@neurovision.ai
```

---

## 3. Local Installation & Startup Sequence

### Step 1: Set Up Python Virtual Environment
```bash
# Navigate to project root
cd "c:\Visual Studio\Brain Tumor Advanced"

# Create virtual environment
python -m venv .venv

# Activate virtual environment:
# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On Windows Command Prompt:
.venv\Scripts\activate.bat
# On Linux / macOS:
source .venv/bin/activate
```

### Step 2: Install Python Backend Dependencies
```bash
pip install --upgrade pip
pip install -r backend/requirements.txt
```

### Step 3: Build React Frontend
```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Build production bundle into frontend/dist
npm run build

# Return to project root
cd ..
```

### Step 4: Launch the Server
```bash
# Option A: Using Windows batch script
.\start_server.bat

# Option B: Direct Python execution from project root
python -m uvicorn backend.main:app --reload --port 8000 --host 0.0.0.0
```

---

## 4. Expected Successful Startup Indicators

Upon executing the startup command, observe the terminal output for the following sequential success indicators:

```
INFO:     Will watch for changes in these directories: ['c:\\Visual Studio\\Brain Tumor Advanced']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started re-loader process [PID 14208] using StatReload
[App] NEUROSCAN AI Database initialized & staff roles seeded.
[Predictor] Using device: cpu
[Predictor] Loaded best classifier: concat_no_attn from concat_no_attn_best.pth
[Predictor] Loaded U-Net from attention_unet_best.pth
[App] NeuroVision ML Predictor loaded successfully (Variant: concat_no_attn).
INFO:     Application startup complete.
```

### Verification Checklist:
1. Open browser to `http://localhost:8000/health`. Response must be HTTP 200 with `"status": "healthy"`.
2. Open browser to `http://localhost:8000/`. The React Single Page Application should load.
3. Open browser to `http://localhost:8000/docs`. The interactive OpenAPI / Swagger UI must render.

---

## 5. Docker Deployment & Orchestration

### 5.1 Standard Deployment (Application + Embedded SQLite)
```bash
# Build and start container in detached mode
docker compose up -d --build

# View container logs
docker compose logs -f neurovision-app
```

### 5.2 Enterprise High-Concurrency Deployment (Application + PostgreSQL)
```bash
# Launch with PostgreSQL database service profile
docker compose --profile with-postgres up -d --build

# Verify running containers
docker ps
```

---

## 6. How to Verify Core Features

### 6.1 Default Institutional Credentials
The database automatically seeds 3 pre-configured staff accounts on initialization (`backend/database.py:284-340`):

| Role | Username | Password | Full Name | Primary Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Doctor** | `doctor` | `doctor123` | Dr. Sarah Chen | Review cases, inspect XAI overlays, generate reports |
| **Technician** | `tech` | `tech123` | Alex Martinez | Upload MRI scans, check acquisition quality |
| **Admin** | `admin` | `admin123` | Prof. James Liu | Provision staff accounts, inspect security audit logs |

### 6.2 Manual Verification Walkthrough
1. **Login:** Navigate to `http://localhost:8000/login`. Enter `doctor` / `doctor123`.
2. **Scan Ingestion:** Click "Upload MRI Scan" in the sidebar. Select an image from `dataset/Testing/glioma/Te-gl_1.jpg`. Enter Patient Name "Arthur Pendelton". Click "Execute Analysis".
3. **Inspect XAI & Biomarkers:** On `/scan/:id`, verify:
   - Pathology prediction (`Glioma`, confidence $>85\%$).
   - Uncertainty tier (`LOW` or `MEDIUM`).
   - Attention U-Net heatmap mask overlay toggle.
   - Grad-CAM and Integrated Gradients heatmap tabs.
   - Radiomics progress bars showing SHAP rankings.
4. **Report Generation:** Click "Generate Clinical Report". Verify Report v1 appears with mandatory disclaimers.
5. **Audit Trail Verification:** Sign out. Log in as `admin` / `admin123`. Navigate to `/admin/audit-logs`. Confirm the `UPLOAD_AND_ANALYZE_SCAN` event appears with your IP and timestamp.

---

## 7. Running the Test Suites

Execute test verification scripts from the project root in an active virtual environment:

### Run Model Inference Smoke Test:
```bash
python test_pipeline.py
```
*Expected Output:* Tests 4 images (one per class). Outputs confidence, uncertainty, radiomics count, and displays `ALL TESTS PASSED`.

### Run Full End-to-End API Test Suite:
```bash
# Ensure server is running on http://127.0.0.1:8000 in a separate terminal
python test_e2e_full.py
```
*Expected Output:* 
```
STARTING E2E FULL VERIFICATION SUITE -- NEUROSCAN AI
[TEST 1] System Health & Strict API Guard... [OK]
[TEST 2] Doctor Login Flow... [OK]
[TEST 3] MRI Scan Ingestion & Deep Learning Pipeline... [OK]
[TEST 4] Clinical Diagnostic Report Generation & Download... [OK]
[TEST 5] Clinical Case Management... [OK]
[TEST 6] Technician Login & RBAC Enforcement... [OK]
[TEST 7] Administrator Dashboard, User Management & Audit Trail... [OK]
[TEST 8] Frontend SPA Serving... [OK]
ALL E2E VERIFICATION TESTS PASSED SUCCESSFULLY (100% PASS RATE)!
```

---

## 8. Troubleshooting & Common Errors

| Issue / Error Symptom | Root Cause | Exact Resolution |
| :--- | :--- | :--- |
| **`ImportError: No module named 'torch'`** | Python virtual environment not activated or dependencies not installed. | Activate virtual environment (`.venv\Scripts\Activate.ps1`) and run `pip install -r backend/requirements.txt`. |
| **`OperationalError: no such table: users`** | Database file missing or DDL initialization skipped. | Delete any 0-byte `neurovision.db` and restart Uvicorn. `lifespan()` in `backend/main.py` will execute `create_tables()` automatically. |
| **`HTTP 503: ML Model predictor is initializing`** | Checkpoint weights missing or still loading. | Check terminal logs. Ensure `saved_models/concat_no_attn_best.pth` and `saved_models/attention_unet_best.pth` exist. |
| **`HTTP 413: File exceeds maximum allowed upload size`** | Uploaded image file is larger than 25 MB. | Compress the image or increase `MAX_UPLOAD_SIZE_BYTES` in `.env`. |
| **`HTTP 429: Too many login attempts`** | Sliding-window rate limiter triggered by 5 consecutive failures. | Wait 300 seconds (5 minutes) for the window to reset, or restart the server process to clear the in-memory counter. |
| **Frontend displays white screen or 404** | React production bundle has not been built into `frontend/dist`. | Run `cd frontend && npm install && npm run build` and ensure `frontend/dist/index.html` exists. |
| **Windows MIME type error: `.js` served as `text/plain`** | Corrupted Windows Registry MIME type mapping for `.js` files. | `backend/main.py:24-28` already includes `mimetypes.add_type("text/javascript", ".js")` to override registry corruption. |

---

## 9. Safe Shutdown Procedures

### Stopping Local Server:
Press `Ctrl + C` in the running terminal. Uvicorn will intercept `SIGINT`, run lifespan cleanup, print `[App] NEUROSCAN AI Server shutting down`, and terminate gracefully without database corruption.

### Stopping Docker Containers:
```bash
# Stop and remove active containers without losing database volume data
docker compose down

# For PostgreSQL profile:
docker compose --profile with-postgres down
```
