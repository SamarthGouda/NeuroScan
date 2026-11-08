# NeuroVision (NeuroScan AI) — API Architecture & Integration Specifications

> **Target Interview Role:** Graduate Technology Role at **Thermo Fisher Scientific**  
> **Core Concepts Covered:** REST Standards, JSON Contracts, HTTP Status Codes, Cookie/Bearer Auth, Rate Limiting, Idempotency, Perimeter Data Validation, and Enterprise Healthcare Integrations (PACS/DICOM, FHIR, ServiceNow).

---

## 1. REST Architectural Principles in NeuroVision

The NeuroVision API adheres to standard REST (Representational State Transfer) constraints:
1. **Stateless Operations:** Every request contains all context necessary for authentication (`auth_token` cookie or `Authorization: Bearer <token>`). The server holds no in-memory HTTP session state.
2. **Resource-Oriented URIs:** Endpoints use clean plural nouns representing database entities (`/api/scans`, `/api/patients`, `/api/cases`, `/api/reports`, `/api/users`).
3. **HTTP Verbs as Actions:**
   - `GET`: Safe, idempotent read operations.
   - `POST`: Non-idempotent resource creation (scan upload, user creation, report generation).
   - `PUT`: Idempotent resource mutation (updating case status and physician notes).
   - `DELETE`: Resource state toggling (soft-deactivating users).
4. **Standardized HTTP Status Codes:** Consistent semantics across all routes (200 OK, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 413 Payload Too Large, 429 Too Many Requests, 500 Internal Error, 503 Service Unavailable).

---

## 2. Exhaustive API Endpoint Catalog

---

### 2.1 System & Health Probes

#### `GET /health` and `GET /api/health`
- **Purpose:** System telemetry and container orchestration liveness probe.
- **Access Level:** Public / Unauthenticated.
- **File Location:** `backend/main.py:106-141`
- **Request Parameters / Body:** None.
- **Operations:**
  - Pings the database with a live transactional query: `SELECT 1`.
  - Verifies if `app.state.predictor` is initialized and memory-resident.
- **Response Structure (HTTP 200 OK):**
```json
{
  "status": "healthy",
  "application": "NEUROVISION AI",
  "version": "3.0.4",
  "environment": "development",
  "database": {
    "status": "connected",
    "engine": "sqlite"
  },
  "ml_inference": {
    "status": "ready",
    "model_variant": "concat_no_attn",
    "architecture": "CNN-ViT Hybrid + Attention U-Net",
    "explainability": "Grad-CAM, Grad-CAM++, Integrated Gradients"
  }
}
```
- **Error Handling:** If the database query throws an exception, returns `"status": "degraded"` with `"database": {"status": "unhealthy: OperationalError"}`.

---

### 2.2 Authentication & User Management (`/api/auth/*` & `/api/users/*`)

#### `POST /api/auth/login`
- **Purpose:** Staff credential authentication, rate limiting, and signed token issuance.
- **Access Level:** Public.
- **File Location:** `backend/api/routes_auth.py:157-226`
- **Rate Limit:** 5 failed attempts per 300 seconds per client IP.
- **Request Body (`application/json`):**
```json
{
  "username": "doctor",
  "password": "doctor123"
}
```
- **Validation Logic:** Sanitizes username; checks password presence; enforces rate limit via `check_rate_limit(f"login_{client_ip}")`.
- **Database Operations:** Queries `users` table by `username` or `email` where `is_active == True`. Verifies password against PBKDF2 hash using constant-time comparison `verify_password()`.
- **Response Headers:** `Set-Cookie: auth_token=...; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`
- **Response Body (HTTP 200 OK):**
```json
{
  "id": "b49aa718-825a-4ba1-b8c9-c5a5e348553b",
  "username": "doctor",
  "email": "doctor@neuroscan.ai",
  "fullName": "Dr. Sarah Chen",
  "role": "doctor",
  "title": "Lead Neuroradiologist",
  "avatar": "SC",
  "permissions": ["predict", "history", "cases", "reports", "upload"],
  "token": "eyJzdWIi...HMAC_SIGNATURE"
}
```
- **Error Status Codes:**
  - `401 Unauthorized`: "Invalid username or password."
  - `429 Too Many Requests`: "Too many login attempts. Please wait 5 minutes."

---

#### `GET /api/auth/user`
- **Purpose:** Hydrates client authentication state on page load.
- **Access Level:** Authenticated.
- **File Location:** `backend/api/routes_auth.py:240-256`
- **Response (HTTP 200 OK):** Returns current user profile JSON.
- **Error (HTTP 401 Unauthorized):** Clean JSON: `{"detail": "Authentication required. Please log in."}` (Strict API guard prevents HTML fallback).

---

#### `POST /api/auth/otp/send`
- **Purpose:** Generates a cryptographically secure 6-digit numeric OTP and dispatches it via SMTP.
- **Access Level:** Public.
- **File Location:** `backend/api/routes_auth.py:260-310`
- **Request Body:** `{"email": "clinician@neuroscan.ai", "purpose": "login"}`
- **Operations:** Generates OTP via `secrets.choice("0123456789")`; hashes OTP with SHA-256 salt; inserts record into `email_otps` with 10-minute expiry; invokes `send_otp_email()`.

---

#### `POST /api/auth/otp/verify`
- **Purpose:** Validates 6-digit verification code and issues an authenticated session token.
- **Access Level:** Public.
- **File Location:** `backend/api/routes_auth.py:312-370`
- **Request Body:** `{"email": "clinician@neuroscan.ai", "otp": "582914", "purpose": "login"}`
- **Security Logic:** Enforces maximum 5 attempts per OTP record. Verifies `is_used == False` and `expires_at > now`. Timing-safe hash comparison via `hmac.compare_digest`. Marks OTP as used.

---

#### `GET /api/users`
- **Purpose:** Staff directory listing.
- **Access Level:** Admin Only (`require_role(["admin"])`).
- **File Location:** `backend/api/routes_users.py:51-58`
- **Response (HTTP 200 OK):** Array of all user accounts.
- **Error (HTTP 403 Forbidden):** Raised if a doctor or technician attempts access.

---

#### `POST /api/users`
- **Purpose:** Provisions a new hospital staff member.
- **Access Level:** Admin Only (`require_role(["admin"])`).
- **File Location:** `backend/api/routes_users.py:60-103`
- **Request Body:**
```json
{
  "username": "dr_watson",
  "email": "watson@neuroscan.ai",
  "full_name": "Dr. John Watson",
  "role": "doctor",
  "password": "Password123!",
  "title": "Associate Radiologist"
}
```
- **Operations:** Validates username/email uniqueness; hashes password with PBKDF2; commits `User`; logs `CREATE_USER` in `audit_logs`.

---

### 2.3 Medical Scan Ingestion & Analysis (`/api/scans/*`)

#### `POST /api/scans/upload`
- **Purpose:** Ingests raw MRI scan, validates binary security, runs ML pipeline, persists entities, and creates cases and diagnostic reports.
- **Access Level:** Authenticated (Doctor, Technician, Admin).
- **File Location:** `backend/api/routes_scans.py:154-373`
- **Request Content-Type:** `multipart/form-data`
- **Form Parameters:**
  - `scan`: Binary image file (JPEG, PNG, TIFF).
  - `patientId`: Optional string (links to existing patient).
  - `patientName`: Optional string (e.g., `"Arthur Pendelton"`).
  - `patientAge`: Optional integer string (e.g., `"58"`).
  - `patientGender`: Optional string (`"Male"`, `"Female"`).
  - `hospitalName`: Optional string.
- **Perimeter Validation:**
  - Maximum upload size quota: 25 MB (`MAX_UPLOAD_SIZE_BYTES`).
  - Whitelist: `.jpg`, `.jpeg`, `.png`, `.bmp`, `.webp`, `.tif`, `.tiff`.
  - Magic byte header verification: `\xff\xd8\xff` (JPEG), `\x89PNG` (PNG), `BM` (BMP), `RIFF` (WEBP), `II*`/`MM*` (TIFF).
- **Pipeline Execution:** Runs `NeuroVisionPredictor.predict()`:
  - 50 Monte Carlo Dropout forward passes.
  - Attention U-Net segmentation.
  - Grad-CAM, Grad-CAM++, Score-CAM, and Integrated Gradients generation.
  - 13 Radiomics features + SHAP tree attribution.
  - Weighted composite risk score.
  - Deterministic clinical report text synthesis.
- **Database Operations (Single Transaction):**
  - Resolves or creates `Patient` record (`PT-2026-XXXX`).
  - Inserts `Scan` record (`status: "completed"`).
  - Inserts `Analysis` record holding all metrics and base64 overlays.
  - Inserts `Case` record (`CASE-2026-XXXX`, priority `urgent` if high risk).
  - Inserts `DiagnosticReport` v1.
  - Inserts in-app `Notification` targeted to `doctor`.
  - Inserts `AuditLog` entry (`action: "UPLOAD_AND_ANALYZE_SCAN"`).
- **Response (HTTP 200 OK):**
```json
{
  "id": "1b99e424-9988-4eed-af89-d0ab254fa6b7",
  "patientId": "32d4ff9d-ce3b-419d-8e48-c2686afbb74a",
  "patientCode": "PT-2026-9901",
  "patientName": "Arthur Pendelton",
  "patientAge": 58,
  "patientGender": "Male",
  "fileName": "scan_1b99e424_1787259480.jpg",
  "imageUrl": "/uploads/scan_1b99e424_1787259480.jpg",
  "status": "completed",
  "tumorDetected": true,
  "tumorType": "Glioma",
  "confidence": 0.896,
  "uncertainty": 0.026,
  "uncertaintyTier": "LOW",
  "riskLevel": "MEDIUM",
  "riskScore": 0.523,
  "tumorLocation": "Cerebral Hemisphere",
  "tumorSize": "4.2% volume",
  "analysisData": {
    "predicted_class": "glioma",
    "tumor_type": "Glioma",
    "confidence": 0.896,
    "uncertainty": 0.026,
    "uncertainty_tier": "LOW",
    "entropy": 0.384,
    "risk_level": "MEDIUM",
    "risk_score": 0.523,
    "xai": {
      "gradcam": "data:image/png;base64,...",
      "gradcam_plus": "data:image/png;base64,...",
      "integrated_gradients": "data:image/png;base64,...",
      "faithfulness": {
        "pointing_game": {"gradcam": 1.0, "gradcam_plus": 1.0},
        "pixel_flipping": {"k_values": [5, 10, 20, 30, 50], "gradcam": [0.72, 0.51, 0.32, 0.18, 0.05]}
      }
    },
    "segmentation": {
      "mask_overlay": "data:image/png;base64,...",
      "tumor_area_pixels": 2110,
      "tumor_area_percent": 4.21
    },
    "top_radiomics_features": [
      {"name": "FirstOrder_Variance", "value": 0.84, "shap": 0.124, "direction": "up"},
      {"name": "GLCM_Contrast", "value": 0.76, "shap": 0.098, "direction": "up"}
    ],
    "clinical_report": "NEUROSCAN AI CLINICAL RADIOLOGY REPORT\n..."
  }
}
```
- **Error Status Codes:**
  - `400 Bad Request`: "File integrity check failed: file header does not match a valid medical image format."
  - `413 Payload Too Large`: "File exceeds maximum allowed upload size of 25MB."
  - `503 Service Unavailable`: "ML Model predictor is initializing. Please retry in a few seconds."

---

#### `GET /api/scans/{scan_id}`
- **Purpose:** Fetches complete scan record and analysis details.
- **Access Level:** Authenticated.
- **File Location:** `backend/api/routes_scans.py:385-395`
- **Response (HTTP 200 OK):** Full scan detail JSON.

---

### 2.4 Clinical Case Management (`/api/cases/*`)

#### `GET /api/cases`
- **Purpose:** Lists clinical review board cases.
- **Access Level:** Authenticated.
- **File Location:** `backend/api/routes_cases.py:60-74`
- **Query Parameters:** `status` (`active`, `under_review`, `completed`), `priority` (`low`, `medium`, `high`, `urgent`).
- **Response (HTTP 200 OK):** Array of case objects joined with patient demographics and tumor findings.

---

#### `PUT /api/cases/{case_id}`
- **Purpose:** Updates case triage status, priority, attending doctor, and clinical review notes.
- **Access Level:** Authenticated (Doctor or Admin).
- **File Location:** `backend/api/routes_cases.py:88-123`
- **Request Body:**
```json
{
  "status": "under_review",
  "priority": "high",
  "notes": "Focal mass requires contrast correlation.",
  "assigned_doctor_id": "b49aa718-825a-4ba1-b8c9-c5a5e348553b"
}
```
- **Operations:** Updates case record; updates `updated_at` timestamp; commits transaction; logs `UPDATE_CASE` in `audit_logs`.
- **Response (HTTP 200 OK):** Updated case JSON.

---

### 2.5 Clinical Reporting (`/api/reports/*`)

#### `POST /api/scans/{scan_id}/reports/generate`
- **Purpose:** Compiles a new versioned diagnostic report from analysis metrics.
- **Access Level:** Authenticated (Doctor or Admin).
- **File Location:** `backend/api/routes_reports.py:74-142`
- **Operations:** Increments version count; executes deterministic template engine; commits `DiagnosticReport`; logs `GENERATE_REPORT`.
- **Response (HTTP 200 OK):** Report record JSON with version number and formatted content.

---

#### `GET /api/reports/{report_id}/download`
- **Purpose:** Streams clinical report as an attachment.
- **Access Level:** Authenticated.
- **File Location:** `backend/api/routes_reports.py:144-170`
- **Response Headers:** `Content-Type: text/plain; charset=utf-8`, `Content-Disposition: attachment; filename="neuroscan_report_XXXX.txt"`
- **Operations:** Logs `DOWNLOAD_REPORT` in `audit_logs`.

---

### 2.6 Regulatory Audit Trail (`/api/audit/*`)

#### `GET /api/audit`
- **Purpose:** Regulatory security and compliance event inspection.
- **Access Level:** Admin Only (`require_role(["admin"])`).
- **File Location:** `backend/api/routes_audit.py:34-69`
- **Query Parameters:** `search` (keyword), `action` (`LOGIN`, `UPLOAD_SCAN`), `username`, `role`, `limit` (default 100), `offset` (default 0).
- **Response (HTTP 200 OK):**
```json
{
  "total": 99,
  "logs": [
    {
      "id": "7a8b9c0d-1234-5678-90ab-cdef12345678",
      "userId": "b49aa718-825a-4ba1-b8c9-c5a5e348553b",
      "username": "doctor",
      "role": "doctor",
      "action": "UPLOAD_AND_ANALYZE_SCAN",
      "resourceType": "scan",
      "resourceId": "1b99e424-9988-4eed-af89-d0ab254fa6b7",
      "details": "Analyzed MRI for patient 'Arthur Pendelton'. Classified: Glioma (Conf: 89.6%)",
      "ipAddress": "127.0.0.1",
      "userAgent": "Mozilla/5.0 ...",
      "timestamp": "2026-03-28T14:22:01Z"
    }
  ]
}
```

---

## 3. External Integrations: Current State vs. Enterprise Roadmap

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CURRENT INTEGRATIONS                              │
│                                                                             │
│  [VERIFIED] Google OAuth 2.0        [VERIFIED] SMTP Email Service           │
│  • Token exchange via httpx          • Direct socket connection to port 587 │
│  • Google userinfo endpoint          • TLS encryption handshake             │
│  • Auto-linking of clinical profiles • Mock local terminal fallback         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                  PROPOSED ENTERPRISE ROADMAP (THERMO FISHER)                │
│                                                                             │
│  1. Hospital PACS / DICOM Protocol   2. ServiceNow CMDB & ITAM Gateway      │
│  • DIMSE C-STORE / C-FIND receiver   • REST API asset registration          │
│  • DICOM header tag extraction       • Model license tracking & compliance  │
│                                                                             │
│  3. HL7 / FHIR Clinical Messaging    4. Asynchronous Task Queue             │
│  • DiagnosticReport resource push    • Celery / Redis background workers    │
│  • EHR interoperability (Epic/Cerner)• Horizontal GPU cluster scale         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Current Integrations Audit
1. **Google OAuth 2.0 (`backend/api/routes_auth.py:596-732`):**
   - Implements Authorization Code flow and Google Identity Services ID Token verification.
   - Client sends OAuth authorization code or ID token to `/api/auth/google/callback` or `/api/auth/google/verify`.
   - Backend exchanges code via `httpx.AsyncClient` against `https://oauth2.googleapis.com/token` using `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
   - Fetches verified profile from `https://www.googleapis.com/oauth2/v2/userinfo`.
   - Automatically provisions a new clinician account if absent, sets `auth_token` cookie, and establishes session.
2. **SMTP Email Service (`backend/email_service.py:1-104`):**
   - Connects to standard mail relays (Port 587 via STARTTLS or Port 465 via SSL).
   - Authenticates credentials and dispatches HTML-formatted OTP codes.
   - Includes developer mock fallback when SMTP credentials are unconfigured.

---

### 3.2 Proposed Enterprise Integrations (Thermo Fisher Alignment)

#### Integration A: Hospital PACS & DICOM Receiver (DICOMweb / C-STORE)
- **Clinical Need:** Clinical MRI scanners transmit multi-slice `.dcm` files across hospital local networks using the DICOM protocol rather than uploading JPEGs via web forms.
- **Proposed Architecture:**
  - Deploy a lightweight DICOM Storage Service Class Provider (SCP) using `pynetdicom`.
  - Listen on standard PACS port `104` or `11112`.
  - Receive C-STORE requests, extract DICOM metadata tags (Patient ID `(0010,0020)`, Patient Name `(0010,0010)`, Slice Thickness `(0018,0050)`, Magnetic Field Strength `(0018,0087)`), extract pixel arrays using `SimpleITK`, and feed them to `NeuroVisionPredictor`.

#### Integration B: HL7 / FHIR Clinical Interoperability
- **Clinical Need:** In enterprise hospital networks, diagnostic reports must sync back to the Electronic Health Record (EHR) systems like Epic Systems or Cerner.
- **Proposed Architecture:**
  - Create a FHIR R4 export endpoint `POST /api/fhir/DiagnosticReport`.
  - Map `Analysis` and `DiagnosticReport` database fields to a standardized FHIR JSON resource:
```json
{
  "resourceType": "DiagnosticReport",
  "id": "neurovision-rep-001",
  "status": "final",
  "category": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/v2-0074", "code": "RAD"}]}],
  "code": {"coding": [{"system": "http://loinc.org", "code": "24725-4", "display": "Brain MRI Report"}]},
  "subject": {"reference": "Patient/PT-2026-9901"},
  "conclusion": "Glioma with 89.6% confidence and moderate risk tier.",
  "presentedForm": [{"contentType": "text/plain", "data": "BASE64_REPORT_TEXT..."}]
}
```

#### Integration C: ServiceNow CMDB & IT Asset Tracking Gateway
- **Enterprise Need (Target Role):** Enterprise IT organizations need visibility into software assets, deep learning model versions, container instances, and compliance configurations across their digital estate.
- **Proposed Architecture:**
  - A Python automation job querying `/api/health` and `/api/stats/system`.
  - Pushes telemetry to the ServiceNow Table API (`/api/now/table/cmdb_ci_appl`):
```json
{
  "name": "NeuroVision Clinical AI",
  "version": "3.0.4",
  "operational_status": "Operational",
  "install_status": "Installed",
  "classifier_variant": "concat_no_attn",
  "database_type": "PostgreSQL 15",
  "encryption_status": "PBKDF2 Salted"
}
```
