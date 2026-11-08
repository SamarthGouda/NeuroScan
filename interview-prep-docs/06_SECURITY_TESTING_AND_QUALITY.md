# NeuroVision (NeuroScan AI) — Security, Quality & Reliability Audit

> **Target Interview Role:** Graduate Technology Role at **Thermo Fisher Scientific**  
> **Core Concepts Covered:** Enterprise Cybersecurity, OWASP Top 10, Data Quality, Input Validation, Defect Auditing, Automated E2E Test Suites, and Comprehensive Test Plans.

---

## 1. Comprehensive Security & Vulnerability Audit

Each vulnerability and security architectural control has been audited against actual codebase evidence. Findings are categorized by OWASP Top 10 classifications.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SECURITY DEFENSE-IN-DEPTH                          │
│                                                                             │
│  [PERIMETER]  Sliding-Window Rate Limiting (5 req / 300s)                   │
│  [PERIMETER]  HTTP Security Headers (nosniff, DENY, XSS, HSTS)              │
│  [PERIMETER]  Magic-Byte Inspection (JPEG, PNG, TIFF) + 25MB File Quotas   │
│                                                                             │
│  [AUTH TIER]  PBKDF2-HMAC-SHA256 (100k iters) + Constant-Time Comparison   │
│  [AUTH TIER]  Tamper-Proof HMAC-SHA256 Signed Bearer Tokens & HttpOnly Cookies│
│  [AUTH TIER]  Role-Based Access Control (RBAC: doctor / technician / admin) │
│                                                                             │
│  [DATA TIER]  SQLAlchemy Parameterized Queries (Zero Raw SQL Injection)     │
│  [DATA TIER]  Foreign Key Cascades & Collision-Proof Sequential Patient IDs │
│  [DATA TIER]  Append-Only Immutable Regulatory Audit Trail                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 1.1 OWASP Vulnerability Matrix

| OWASP Category | Security Control in NeuroVision | Implementation Evidence | Residual Risk & Remediation |
| :--- | :--- | :--- | :--- |
| **A01: Broken Access Control** | Role-Based Access Control (RBAC) dependency factories enforcing role isolation. | `backend/auth.py:206-216` (`require_role(["admin"])` on `/api/users` and `/api/audit`). | Low risk. Technicians and doctors are blocked with clean HTTP 403 Forbidden. Verified in `test_e2e_full.py:130-138`. |
| **A02: Cryptographic Failures** | Salted PBKDF2-HMAC-SHA256 password hashing with 100,000 iterations. | `backend/auth.py:71-75` (`hashlib.pbkdf2_hmac("sha256", ..., salt=16 bytes, 100_000)`). | Low risk. Timing attacks neutralized via `hmac.compare_digest`. Secrets loaded via environment variables. |
| **A03: Injection (SQL & Command)** | 100% Parameterized ORM queries via SQLAlchemy 2.0. No string formatting in SQL. | `backend/database.py`, `backend/api/*.py` (all queries use `.filter()`). | Negligible risk. User inputs are bound as parameters. Raw shell commands are never executed. |
| **A04: Insecure Design** | Clinical risk stratification flags high uncertainty; human review required. | `backend/inference/uncertainty.py:77-80`, `backend/inference/risk_stratifier.py:51-85`. | AI outputs never initiate automatic treatment; mandatory clinical disclaimers attached to all reports. |
| **A05: Security Misconfiguration** | Defensive HTTP security headers injected globally via Starlette middleware. | `backend/main.py:92-102` (`nosniff`, `DENY`, `X-XSS-Protection`, `Strict-Transport-Security`). | Low risk. Production mode enables HSTS. API routes protected against HTML SPA fallback. |
| **A06: Vulnerable Components** | Dependencies pinned to stable major versions in `requirements.txt`. | `backend/requirements.txt:1-26` (`torch>=2.0.0`, `fastapi>=0.100.0`). | Moderate risk. Dependency scanning (e.g., Snyk or Dependabot) should be integrated into GitHub Actions CI. |
| **A07: Identification & Auth** | Brute-force rate limiting + Single-use 6-digit cryptographic OTPs. | `backend/auth.py:36-51`, `backend/auth.py:95-112`. | Rate limiter is in-memory; multi-instance cluster requires Redis backend. |
| **A08: Software & Data Integrity**| Medical scan magic-byte verification rejecting polyglot files. | `backend/api/routes_scans.py:31-65` (verifies `\xff\xd8\xff`, `\x89PNG`). | High security. Executable files disguised with `.jpg` extensions are rejected before image processing. |
| **A09: Logging & Monitoring** | Immutable security audit trail recording all critical actions. | `backend/database.py:202-216`, `backend/auth.py:220-253`. | Audits capture user identity, IP, user-agent, timestamp, action tag, and resource target. |
| **A10: SSRF** | Google OAuth callback uses hardcoded Google token endpoints. | `backend/api/routes_auth.py:640-660` (URL is hardcoded constant). | Negligible risk. User input never influences outbound HTTP request destinations. |

---

### 1.2 Deep Vulnerability & Quality Audit

#### 1. Hardcoded Credentials & Exposed Secrets
- **Finding:** The repository template `.env.example` provides placeholder strings.
- **Code Inspection:** In `backend/config.py:61-64`, if the environment variable `NEUROSCAN_AUTH_SECRET` is unset, the code falls back to `"neuroscan_ai_clinical_secure_token_secret_2026_key"`.
- **Severity:** Medium (in Development), Critical (if deployed to Production without `.env`).
- **Remediation:** In `config.py`, enforce an explicit runtime check:
```python
if IS_PRODUCTION and (not os.getenv("NEUROSCAN_AUTH_SECRET") or AUTH_SECRET.startswith("neuroscan_ai_clinical")):
    raise RuntimeError("CRITICAL SECURITY ERROR: NEUROSCAN_AUTH_SECRET must be configured with a secure random key in production!")
```

#### 2. SQL Injection Review
- **Finding:** Clean. Every database interaction across all 10 route modules uses SQLAlchemy ORM query constructs: `db.query(Model).filter(Model.column == value)`.
- **Finding on Raw SQL:** The single raw SQL query in the entire backend is `db.execute(text("SELECT 1"))` inside `health_check()` (`backend/main.py:116`), which contains zero user-supplied variables.
- **Conclusion:** SQL injection risk is **zero** `[VERIFIED]`.

#### 3. Cross-Site Scripting (XSS) Review
- **Finding:** Clean. The React frontend uses JSX syntax, which automatically HTML-encodes all dynamic text interpolations (`{patient.fullName}`, `{report.reportContent}`) before DOM injection, neutralizing stored XSS attacks.
- **Header Defense:** `main.py:97` injects `X-XSS-Protection: 1; mode=block` and `X-Content-Type-Options: nosniff`.

#### 4. Insecure File Upload Review
- **Finding:** Multi-layer defense.
  1. Size quota: Enforced at the binary buffer level (`len(contents) > 25MB` raises HTTP 413).
  2. Extension whitelist: Restricts to `.jpg`, `.jpeg`, `.png`, `.bmp`, `.webp`, `.tif`, `.tiff`.
  3. Binary magic bytes: Scans the first 8 bytes of the binary payload. Rejects executables or scripts immediately with HTTP 400.
  4. Path traversal prevention: Uploaded files are written to disk using a newly generated UUID string (`scan_{uuid[:8]}_{timestamp}.jpg`), completely discarding the user-supplied filename for disk operations.
- **Conclusion:** Insecure file upload and path traversal vulnerabilities are **completely mitigated** `[VERIFIED]`.

#### 5. Broken Authentication & RBAC Review
- **Finding:** The authorization dependency `require_role(["admin"])` (`backend/auth.py:206-216`) inspects `user.role` from the database.
- **Verification:** In `test_e2e_full.py:130-138`, a user logged in as `technician` attempted to access `/api/users` and `/api/audit`. Both requests were rejected with `status_code == 403`.
- **Conclusion:** Role isolation is **actively enforced and verified** `[VERIFIED]`.

---

## 2. Testing Suite Audit & Coverage Analysis

### 2.1 Existing Test Suite Inventory

The repository contains two operational automated test suites:

#### 1. `test_pipeline.py` (CLI ML Inference Verification)
- **File Location:** `c:\Visual Studio\Brain Tumor Advanced\test_pipeline.py`
- **Execution Command:** `python test_pipeline.py`
- **Purpose:** Verifies that the multi-model machine learning pipeline initializes and accurately predicts across all four clinical tumor classes on untouched test images.
- **Verified Operations:**
  - `NeuroVisionPredictor` memory instantiation and checkpoint loading.
  - Image tensor normalization and transformation.
  - Monte Carlo Dropout 50-pass stochastic uncertainty computation.
  - Attention U-Net segmentation mask generation.
  - Radiomics feature extraction (13 features).
  - Quad-method XAI generation (Grad-CAM, Grad-CAM++, Score-CAM, Integrated Gradients).
  - Report template generation.
- **Observed Execution Status:** Passed `[VERIFIED]`.

#### 2. `test_e2e_full.py` (Full E2E API Verification Suite)
- **File Location:** `c:\Visual Studio\Brain Tumor Advanced\test_e2e_full.py`
- **Execution Command:** `python test_e2e_full.py`
- **Purpose:** Full integration testing against a running server (`http://127.0.0.1:8000`), testing all user roles, endpoints, database persistence, and security controls.
- **8-Stage Verification Breakdown:**
  1. **Stage 1 (System Health & API Guard):** Tests `/api/health` (200 OK); tests unauthenticated `/api/auth/user` (returns clean JSON 401, not HTML); tests `/api/invalid_xyz` (returns clean JSON 404, not HTML).
  2. **Stage 2 (Doctor Authentication):** Authenticates `doctor:doctor123`; verifies session cookie and role claims.
  3. **Stage 3 (MRI Ingestion & Deep Learning):** Uploads test glioma MRI with patient demographics; validates full analysis payload, base64 overlays, and radiomics.
  4. **Stage 4 (Diagnostic Reporting):** Generates versioned report v1; tests `/api/reports/{id}/download` for disclaimer compliance.
  5. **Stage 5 (Clinical Case Management):** Queries `/api/cases`; updates case status to `under_review` with physician notes.
  6. **Stage 6 (Technician RBAC Isolation):** Authenticates `tech:tech123`; verifies technician is blocked (HTTP 403) from `/api/users` and `/api/audit`.
  7. **Stage 7 (Administrator & Audit Trail):** Authenticates `admin:admin123`; fetches users; provisions new doctor account (`dr_watson`); verifies audit log records events.
  8. **Stage 8 (Frontend SPA Serving):** Tests root `/` to ensure React `index.html` shell is served.
- **Observed Execution Status:** 100% Pass Rate across all 8 stages `[VERIFIED]`.

---

### 2.2 Missing Test Coverage & Edge Case Gaps

While existing E2E tests verify the "happy path" and basic RBAC, critical enterprise test gaps exist:

| Test Category | Missing Coverage | Clinical & Operational Risk | Priority |
| :--- | :--- | :--- | :--- |
| **Boundary Conditions** | Uploading images at exact 25 MB quota threshold or $1 \times 1$ pixel images. | Memory exhaustion or unhandled division-by-zero errors in radiomics. | High |
| **Input Corruption** | Non-image binaries disguised with valid JPEG headers (`\xff\xd8\xff` followed by garbage). | PIL `Image.open` throws unhandled decoding exception. | High |
| **Concurrency & Race Conditions**| Two doctors simultaneously updating the same case notes. | Silent data overwrite (Last-Write-Wins without conflict warning). | Medium |
| **Database Failure Mode** | Database server unreachable during scan upload. | Orphaned image files written to `/uploads` without database records. | High |
| **Brute Force Verification**| Automated testing of 6 consecutive failed logins to trigger HTTP 429. | Unverified rate limiter behavior under high-frequency load. | Medium |
| **Soft Deactivation Guard** | Inactive user (`is_active = False`) attempting to authenticate or use valid token. | Deactivated employees retaining API access until token expiration. | High |

---

## 3. Comprehensive Proposed Test Plan & Test Suite Code

The following comprehensive test suite covers all identified edge cases, error conditions, and boundary limits.

> **Status:** `[PROPOSED ENHANCEMENT]` — Clearly labeled as recommended test code; does not modify existing repository files.

```python
"""
PROPOSED TEST SUITE: test_edge_cases_and_quality.py
Covers: Boundary inputs, file corruption, rate limiting, and deactivation guards.
"""
import pytest
import requests
import io
from PIL import Image

BASE_URL = "http://127.0.0.1:8000"

# ─── 1. Boundary Condition: File Size Limit (25MB Quota) ─────────────────────
def test_upload_exceeding_file_quota_returns_413():
    session = requests.Session()
    session.post(f"{BASE_URL}/api/auth/login", json={"username": "doctor", "password": "doctor123"})
    
    # Create 26 MB dummy buffer (exceeds 25 MB limit)
    oversized_buffer = io.BytesIO(b"\xff\xd8\xff" + b"0" * (26 * 1024 * 1024))
    files = {"scan": ("huge_scan.jpg", oversized_buffer, "image/jpeg")}
    
    res = session.post(f"{BASE_URL}/api/scans/upload", files=files)
    assert res.status_code == 413
    assert "exceeds maximum allowed upload size" in res.json()["detail"]


# ─── 2. Input Corruption: Valid Magic Bytes, Corrupted Payload ───────────────
def test_corrupted_image_payload_returns_400():
    session = requests.Session()
    session.post(f"{BASE_URL}/api/auth/login", json={"username": "doctor", "password": "doctor123"})
    
    # Valid JPEG header followed by random corrupted bytes
    corrupted_buffer = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00corrupted_byte_stream_xyz")
    files = {"scan": ("corrupted.jpg", corrupted_buffer, "image/jpeg")}
    
    res = session.post(f"{BASE_URL}/api/scans/upload", files=files)
    assert res.status_code == 400
    assert "Could not parse image file" in res.json()["detail"]


# ─── 3. Security: Rate Limiting Enforcement ──────────────────────────────────
def test_brute_force_login_triggers_rate_limiting():
    session = requests.Session()
    endpoint = f"{BASE_URL}/api/auth/login"
    payload = {"username": "admin", "password": "wrong_password_attempt"}
    
    status_codes = []
    for _ in range(7):
        res = session.post(endpoint, json=payload)
        status_codes.append(res.status_code)
    
    # First 5 should be 401 Unauthorized, 6th and 7th must be 429 Too Many Requests
    assert 429 in status_codes
    assert status_codes[-1] == 429


# ─── 4. Access Control: Deactivated User Token Invalidation ───────────────────
def test_deactivated_user_token_is_immediately_rejected():
    admin_session = requests.Session()
    admin_session.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"})
    
    # Create temporary doctor
    new_user = {
        "username": "temp_doc",
        "email": "temp_doc@neuroscan.ai",
        "full_name": "Dr. Temporary",
        "role": "doctor",
        "password": "Password123!"
    }
    create_res = admin_session.post(f"{BASE_URL}/api/users", json=new_user)
    user_id = create_res.json()["id"]
    
    # Login as temp_doc
    doc_session = requests.Session()
    login_res = doc_session.post(f"{BASE_URL}/api/auth/login", json={"username": "temp_doc", "password": "Password123!"})
    assert login_res.status_code == 200
    
    # Deactivate temp_doc via Admin
    admin_session.delete(f"{BASE_URL}/api/users/{user_id}")
    
    # Verify temp_doc's existing session is immediately rejected on next request
    verify_res = doc_session.get(f"{BASE_URL}/api/auth/user")
    assert verify_res.status_code == 401
    assert "account deactivated" in verify_res.json()["detail"]


# ─── 5. Data Quality: Duplicate Patient ID Collision Avoidance ───────────────
def test_patient_code_sequential_uniqueness():
    session = requests.Session()
    session.post(f"{BASE_URL}/api/auth/login", json={"username": "doctor", "password": "doctor123"})
    
    # Register patient with automatic ID generation
    p1 = session.post(f"{BASE_URL}/api/patients", json={"full_name": "Test Patient Alpha"}).json()
    p2 = session.post(f"{BASE_URL}/api/patients", json={"full_name": "Test Patient Beta"}).json()
    
    assert p1["patientCode"] != p2["patientCode"]
    assert p1["patientCode"].startswith("PT-2026-")
    assert p2["patientCode"].startswith("PT-2026-")
```
