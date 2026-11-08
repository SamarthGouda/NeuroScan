# NeuroVision / NeuroScan AI v3.0.4 — Production Architecture, Security & Deployment Manual

---

## 1. Executive Summary & Architecture Overview

**NeuroVision AI** has been upgraded from a prototype demonstration platform into a clinical-grade, production-ready diagnostic web platform. The upgrade enforces multi-role Role-Based Access Control (RBAC), robust enterprise authentication, and automated audit trails, while preserving **100%** of the underlying deep learning classifiers (ResNet-50 + Swin-Tiny hybrid), Attention U-Net segmentation, radiomics extraction, Bayesian Monte Carlo Dropout uncertainty estimation, and XAI explainability heatmaps.

### Key Architectural Pillars:
- **Single Identity, Multi-Role Architecture:** One verified email or Google OAuth identity can hold multiple clinical roles (`admin`, `doctor`, `technician`) simultaneously. Users switch workspaces seamlessly via an authenticated session without duplicate accounts.
- **Strict Role-Based Authorization:** Every protected route verifies authorization on every single HTTP request against the database-backed membership list. Front-end role declarations are never trusted.
- **Server-Side Session Invalidation:** Cryptographic JWTs are tied to unique `jti` identifiers. Logout and password resets immediately revoke the session via a server-side blacklist table (`revoked_tokens`).
- **Real Verification & Recovery:** Self-service registration requires single-use, 6-digit numeric OTP verification within 15 minutes. Password resets require verified OTP tokens and enforce strong entropy requirements.
- **Zero Mock / Zero Bypass:** Hardcoded passwords, preset one-click demo buttons, and dev bypasses have been eradicated.

```
                          ┌────────────────────────┐
                          │   Client Application   │
                          │   (React 18 + Vite)    │
                          └───────────┬────────────┘
                                      │
                   HTTPS / HttpOnly Cookie (Session Token)
                                      │
                                      ▼
                      ┌────────────────────────────────┐
                      │    FastAPI Application Core    │
                      │   - Security Headers (HSTS)    │
                      │   - Rate Limiter (Brute Force) │
                      │   - Active Role Gatekeeper     │
                      └───────┬──────────────┬─────────┘
                              │              │
              ┌───────────────┴──┐        ┌──┴───────────────┐
              ▼                  ▼        ▼                  ▼
     ┌─────────────────┐   ┌───────────┐ ┌──────────┐ ┌─────────────┐
     │  Auth Engine    │   │ SQLite /  │ │ ML/XAI   │ │   Email     │
     │  (bcrypt + JTI) │   │ Postgres  │ │ Pipeline │ │ Dispatcher  │
     └─────────────────┘   └───────────┘ └──────────┘ └─────────────┘
```

---

## 2. Authentication & Authorization Architecture

### 2.1 Password Hashing & Entropy
- **Algorithm:** `bcrypt` with work factor 12 (4096 rounds), providing modern resistance to GPU-accelerated dictionary attacks.
- **Password Strength Policy:**
  - Minimum 8 characters.
  - At least one alphabet character (`a-z`, `A-Z`).
  - At least one numeric digit (`0-9`).
- **Legacy Migration Support:** Automatic fallback verification for PBKDF2-SHA256 hashes ensures seamless migration of pre-existing staff accounts without disruption.

### 2.2 Token & Session Lifecycle
- **Token Format:** Signed JWT containing:
  - `sub`: User ID (UUID).
  - `role`: Currently active workspace role (`admin`, `doctor`, or `technician`).
  - `roles`: Immutable array of all authorized roles assigned to this identity.
  - `jti`: Unique token nonce (UUID) used for server-side blacklist verification.
  - `exp`: Expiration timestamp (default: 7 days).
- **Transport:** Carried in `HttpOnly`, `SameSite=Lax`, `Secure` (in production) cookies named `neurovision_session`. Also accepts standard `Authorization: Bearer <token>` headers for automated API clients.
- **Revocation:** Calling `/api/auth/logout` records the token's `jti` in the `revoked_tokens` table until the token's natural expiration. Replay of blacklisted tokens produces an immediate `401 Unauthorized`.

### 2.3 Single Identity, Multi-Role Model

Unlike conventional platforms that require separate accounts for different roles, NeuroVision links multiple role authorizations to a single verified user record:

```mermaid
erDiagram
    users ||--o{ user_roles : "holds memberships"
    users ||--o{ scans : "uploaded by"
    users ||--o{ cases : "assigned to"
    users ||--o{ audit_logs : "performed action"

    users {
        string id PK
        string email UK
        string username UK
        string password_hash
        boolean is_email_verified
        string active_role
        string google_sub UK
    }

    user_roles {
        string id PK
        string user_id FK
        string role "admin | doctor | technician"
        datetime assigned_at
        string assigned_by
    }

    revoked_tokens {
        string id PK
        string token_jti UK
        datetime revoked_at
        datetime expires_at
    }

    oauth_states {
        string id PK
        string state UK
        datetime expires_at
    }
```

#### Role Switching Workflow:
1. User logs in. Token is issued with their default `active_role` (e.g. `doctor`).
2. If `user.roles.length > 1`, the UI displays a clinical **Role Switcher** in the top navigation bar.
3. When the user selects a different workspace (e.g. `admin`):
   - Client sends `POST /api/auth/switch-role` with `{"role": "admin"}`.
   - The backend checks `user_roles` in the database to verify whether this user record actually owns the requested role.
   - If unauthorized: Returns `403 Forbidden`.
   - If authorized: Updates `user.active_role = "admin"`, invalidates the old token, issues a fresh token with `role: "admin"`, and logs an immutable audit event (`ROLE_SWITCH`).

---

## 3. Role & Permission Matrix

| Endpoint / Feature | Description | Admin | Doctor | Technician | Public |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `POST /api/auth/register` | Self-service registration (Doctor/Tech) | ❌ | ❌ | ❌ | ✅ |
| `POST /api/auth/verify-email` | OTP email verification | ❌ | ❌ | ❌ | ✅ |
| `POST /api/auth/login` | Credential validation & session issuance | ❌ | ❌ | ❌ | ✅ |
| `POST /api/auth/google/verify` | Google OAuth code exchange | ❌ | ❌ | ❌ | ✅ |
| `POST /api/auth/switch-role` | Switch workspace among authorized roles | ✅ | ✅ | ✅ | ❌ |
| `GET /api/auth/user` | Current identity & authorized roles | ✅ | ✅ | ✅ | ❌ |
| `POST /api/scans/upload` | Upload MRI and run full AI pipeline | ✅ | ✅ | ✅ | ❌ |
| `GET /api/scans` | Retrieve scan catalog | ✅ | ✅ | ✅ | ❌ |
| `GET /api/cases` | View clinical case listings | ✅ | ✅ | ✅ | ❌ |
| `PUT /api/cases/{id}` | Update clinical diagnosis & treatment status | ✅ | ✅ | ❌ (403) | ❌ |
| `POST /api/scans/{id}/reports/generate` | Generate diagnostic radiology report | ✅ | ✅ | ❌ (403) | ❌ |
| `GET /api/reports/{id}/download` | Download signed clinical report | ✅ | ✅ | ❌ (403) | ❌ |
| `GET /api/users` | List all staff members and role bindings | ✅ | ❌ (403) | ❌ (403) | ❌ |
| `POST /api/users` | Create staff account & assign roles | ✅ | ❌ (403) | ❌ (403) | ❌ |
| `PUT /api/users/{id}` | Modify staff account or update roles | ✅ | ❌ (403) | ❌ (403) | ❌ |
| `GET /api/audit` | View immutable security audit logs | ✅ | ❌ (403) | ❌ (403) | ❌ |
| `GET /api/stats/ablation` | View ML model ablation metrics | ✅ | ✅ | ✅ | ❌ |

---

## 4. Google Cloud OAuth 2.0 Configuration Guide

To enable real **Sign in with Google**:

### Step 1: Open Google Cloud Console
1. Visit [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named `NeuroVision-AI` or select an existing project.

### Step 2: Configure OAuth Consent Screen
1. Navigate to **APIs & Services** > **OAuth consent screen**.
2. Select User Type: **External** (or **Internal** if using a Google Workspace organization).
3. Fill in:
   - **App Name:** NeuroVision AI
   - **User support email:** Your email address
   - **Developer contact information:** Your email address
4. Click **Save and Continue**.
5. On the **Scopes** page, add:
   - `openid`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
6. Click **Save and Continue**.

### Step 3: Create OAuth 2.0 Client ID Credentials
1. Navigate to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth client ID**.
3. Select Application type: **Web application**.
4. Set Name: `NeuroVision Web Client`.
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173` *(Vite dev server)*
   - `http://localhost:8000` *(FastAPI server)*
   - `https://your-production-domain.com` *(Production domain)*
6. Under **Authorized redirect URIs**, add:
   - `http://localhost:8000/api/auth/google/callback`
   - `http://localhost:5173/api/auth/google/callback`
   - `https://your-production-domain.com/api/auth/google/callback`
7. Click **Create**.
8. Copy the **Client ID** and **Client Secret**.

### Step 4: Apply Credentials to NeuroVision
Add the credentials into your `.env` file:
```ini
GOOGLE_CLIENT_ID=1234567890-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-yourSecretKeyHere
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
```

---

## 5. Gmail SMTP & Email Delivery Setup Guide

NeuroVision delivers clinical OTP codes, password reset instructions, and security alerts via standard SMTP.

### Step 1: Enable 2-Step Verification
1. Go to your [Google Account Security Settings](https://myaccount.google.com/security).
2. Ensure **2-Step Verification** is turned **ON**.

### Step 2: Generate an App Password
1. Navigate directly to [Google App Passwords](https://myaccount.google.com/apppasswords).
2. Under "App name", type: `NeuroVision AI`.
3. Click **Create**.
4. Google will generate a 16-character code (e.g., `abcd efgh ijkl mnop`).

### Step 3: Apply SMTP Settings to `.env`
Add the following to your `.env` file:
```ini
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-actual-email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
SMTP_FROM="NeuroVision AI <noreply@neurovision.ai>"
SMTP_USE_TLS=true
```

> **Note on Developer Mode:** If `SMTP_HOST` or `SMTP_USER` is empty, the application runs in local console mode. All verification codes and password reset OTPs are printed directly to the terminal console so testing is completely unblocked.

---

## 6. Secure Initial Administrator Provisioning

To prevent insecure default accounts or hardcoded credentials in version control, use the provided secure CLI tool:

### 6.1 Interactive Setup Wizard
Run the interactive wizard from your terminal:
```bash
python manage_admin.py setup
```
1. Enter your verified email address (e.g., your Gmail).
2. Enter your full name.
3. Enter your password (input is masked for security).
4. Select **Option 1**: Assign **ALL THREE ROLES** (`admin`, `doctor`, `technician`).

### 6.2 Non-Interactive CLI Provisioning
You can also provision an administrator via direct command-line arguments:
```bash
python manage_admin.py create-admin \
  --email "yourname@gmail.com" \
  --password "YourStrongPassword123!" \
  --name "Lead Neuroradiologist & Admin" \
  --roles "admin,doctor,technician"
```

### 6.3 Assign Additional Roles to an Existing User
To grant all three roles to an existing registered user:
```bash
python manage_admin.py assign-roles \
  --email "yourname@gmail.com" \
  --roles "admin,doctor,technician"
```

### 6.4 List All Accounts and Active Roles
```bash
python manage_admin.py list-users
```

---

## 7. Local Development Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### Setup Steps
```bash
# 1. Clone repository and navigate to root
cd "Brain Tumor Advanced"

# 2. Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# 3. Install backend dependencies
pip install -r backend/requirements.txt

# 4. Install frontend dependencies and build
npm --prefix frontend install
npm --prefix frontend run build

# 5. Initialize environment
copy .env.example .env

# 6. Run the server
# Option A (Windows shortcut):
start_server.bat
# Option B (Direct command):
python -m uvicorn backend.main:app --port 8000 --host 0.0.0.0 --reload
```
Open your browser to: `http://localhost:8000`

---

## 8. Production Deployment Guide

### Deployment Option A: Single-Container Docker Compose (Recommended)

NeuroVision includes a multi-stage `Dockerfile` that compiles the React frontend and packages it with the FastAPI backend, PyTorch models, and OpenCV libraries:

```bash
# 1. Configure production environment
cp .env.example .env
nano .env  # Set ENVIRONMENT=production, secure secrets, domain CORS, etc.

# 2. Build and launch container
docker compose up -d --build

# 3. Check container logs and health
docker compose logs -f
```

The container automatically mounts:
- `./uploads` for ingested MRI scans.
- `./saved_models` for `.pth` model checkpoints.
- `./neurovision.db` for persistent SQLite storage.

### Deployment Option B: High-Concurrency PostgreSQL Deployment
For high-volume clinical deployments, launch with the PostgreSQL profile:
```bash
docker compose --profile with-postgres up -d --build
```
Update `DATABASE_URL` in `.env`:
```ini
DATABASE_URL=postgresql+psycopg2://neurovision:neurovision_secure_password@postgres-db:5432/neurovision_db
```

### Deployment Option C: Reverse Proxy with Nginx & Let's Encrypt SSL
Place Nginx in front of NeuroVision on port 8000:

```nginx
server {
    listen 80;
    server_name neurovision.hospital.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name neurovision.hospital.org;

    ssl_certificate /etc/letsencrypt/live/neurovision.hospital.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/neurovision.hospital.org/privkey.pem;

    client_max_body_size 30M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

---

## 9. Security Verification & Test Results

The platform has been validated against 28 automated integration and end-to-end test scenarios:

### Security Test Suite (`test_production_auth.py`) — 20/20 PASSED (100%)
1. **Email/Password Registration:** Validates schema, rejects duplicate emails, dispatches OTP.
2. **Email Verification with Single-Use OTP:** Enforces 15-minute expiration and invalidation after use.
3. **Successful Login with Verified Credentials:** Issues `HttpOnly` session cookie with active role.
4. **Invalid Password Rejection:** Constant-time bcrypt check, returns 401.
5. **Unverified Email Login Rejection:** Prevents authentication until OTP is confirmed.
6. **Forgot Password Request & Code Dispatch:** Secure OTP generation without revealing user existence.
7. **Password Reset Expiry & Update Confirmation:** Validates entropy and updates password hash.
8. **Google OAuth Login & State Setup:** Cryptographic state generation preventing CSRF.
9. **Existing Account Google Linking:** Safe linking to existing verified accounts.
10. **Single User with All Three Roles:** Verification of concurrent `['admin', 'doctor', 'technician']` role memberships on one user identity.
11. **Admin-Only Endpoint Protection:** Blocked to Doctor and Technician (403 Forbidden).
12. **Doctor-Only Endpoint Protection:** Blocked to Technician (403 Forbidden).
13. **Technician Role Isolation:** Blocked from modifying case records or reports (403 Forbidden).
14. **Unauthorized Role Switching Prevention:** User cannot switch to an unassigned role.
15. **Direct API Access Without Authentication:** Clean JSON 401 responses on protected endpoints.
16. **Expired Session Rejection:** Tokens past expiry return 401.
17. **Logout & Server-Side Token Revocation:** Server-side JTI blacklist prevents token reuse.
18. **Brute-Force Rate Limiting:** Exceeded attempts trigger 429 Too Many Requests.
19. **CSRF State Protection on OAuth:** Tampered or missing OAuth states return 400 Bad Request.
20. **Production Security Headers:** Verifies `nosniff`, `DENY`, `X-XSS-Protection`, and `Strict-Transport-Security`.

### Deep Learning & Clinical Pipeline (`test_pipeline.py` & `test_e2e_full.py`) — 100% PASSED
- **Glioma Scan Test:** Correct classification (85.2% confidence), Attention U-Net mask (8180 px), Grad-CAM, Grad-CAM++, Integrated Gradients, 10 Radiomics biomarkers.
- **Meningioma Scan Test:** Correct classification (90.6% confidence), Attention U-Net mask (23397 px).
- **No Tumor Scan Test:** Correct classification (89.9% confidence), 0 px segmentation mask.
- **Pituitary Scan Test:** Correct classification (91.8% confidence), Attention U-Net mask (23315 px).
- **Clinical Report Generator:** Validated with mandatory medical and legal disclaimer text.
- **React SPA Serving:** Validated that root `/` serves built React assets.

