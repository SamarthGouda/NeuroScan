# NeuroVision (NeuroScan AI) — File-by-File Technical Deep Dive

> This document provides an exhaustive, code-level architectural walkthrough of every critical source and configuration file in NeuroVision.  
> Each file is analyzed across its Purpose, Important Symbols, Logical Block Breakdown, I/O Contracts, Dependencies, Interview Relevance, Weaknesses/Improvements, and Empirical Evidence.

---

## 1. Backend Core & Infrastructure

---

### File: `backend/main.py`

#### A. Purpose
`backend/main.py` serves as the primary ASGI application entry point for NeuroVision. It orchestrates server lifespan lifecycle events (database initialization, upload directory provisioning, model preloading), configures production HTTP security middleware, mounts all API routers, exposes system health probes, and implements a strict single-page application (SPA) catch-all router that protects API routes from HTML fallback leakage. `[VERIFIED: lines 1-209]`

#### B. Important Code
- **`lifespan(app: FastAPI)`** (lines 49-71): Context manager initializing the database via `create_tables()`, ensuring `/uploads` exists, and preloading `NeuroVisionPredictor` onto `app.state.predictor`.
- **`app = FastAPI(...)`** (lines 75-80): Instantiates the core web application (v3.0.4) with OpenAPI documentation.
- **`add_security_headers(request, call_next)`** (lines 92-102): HTTP middleware applying defensive headers (`nosniff`, `DENY`, `X-XSS-Protection`, `Strict-Transport-Security`).
- **`health_check()`** (lines 106-141): Dual-mounted endpoint (`/health` and `/api/health`) performing live SQL ping probes (`SELECT 1`) and ML readiness checks.
- **`serve_spa_or_api_guard(full_path: str)`** (lines 170-209): Catches all unmatched routes, strictly enforcing JSON 404 responses for any `/api/*` request while serving React `index.html` for client-side navigation.

#### C. Logical-Block Explanation
1. **Bootstrap & MIME Initialization (lines 9-29):** Inserts the backend root into `sys.path` to guarantee deterministic relative imports. Explicitly registers MIME types for `.js`, `.css`, and `.svg` to eliminate Windows registry MIME corruption bugs.
2. **Lifespan Management (lines 47-71):** Runs atomically before the server accepts traffic. Executes DDL creation and role seeding, creates the file upload buffer directory, and instantiates the heavyweight deep learning predictor onto `app.state`, ensuring incoming requests avoid per-call model initialization latency.
3. **Security Middleware (lines 83-102):** Configures CORS allowing origins specified in `.env` (defaulting to local Vite dev ports). The custom HTTP middleware appends defense-in-depth security headers to every outgoing response.
4. **Health Probe (lines 104-142):** Executes a live transactional query against the database session (`SessionLocal`) and verifies whether `app.state.predictor` is memory-resident. Returns HTTP 200 with JSON detailing database engine (`sqlite` or `postgresql`) and active ML model variant.
5. **Router Registration & Static Mounts (lines 144-168):** Mounts ten feature routers under `/api/*` and mounts `/uploads` and `/assets` as static directories.
6. **Strict SPA / API Fallback Guard (lines 170-209):** Solves the classic Single Page Application routing trap. If a client queries an invalid endpoint starting with `api/`, it raises an immediate HTTP 404 JSON exception rather than incorrectly serving `index.html`.

#### D. Inputs and Outputs
- **Inputs:** Inbound HTTP requests from web clients, health monitoring agents, or container probes.
- **Outputs:** JSON API responses, static file streams (`/uploads/*`), or React `index.html`.

#### E. Dependencies
- Relies on: `fastapi`, `sqlalchemy`, `backend/config.py`, `backend/database.py`, `backend/inference/predictor.py`, and all API route modules.
- Depended on by: `Dockerfile`, `docker-compose.yml`, `start_server.bat`, `test_e2e_full.py`.

#### F. Interview Relevance
- **Q:** *Why use a FastAPI lifespan context manager instead of the older `@app.on_event("startup")`?*  
  **A:** `@app.on_event` is deprecated in modern FastAPI/Starlette. Lifespan context managers use Python's standard `contextlib.asynccontextmanager`, cleanly separating startup initialization from teardown logic with standard `try...yield...finally` semantics.
- **Q:** *What is the "SPA Catch-All API Leak" problem and how is it resolved here?*  
  **A:** When hosting a React SPA alongside an API, a generic catch-all route (`/{full_path:path}`) returning `index.html` causes mistyped API requests (e.g., `/api/not-exist`) to return HTTP 200 with HTML instead of HTTP 404 with JSON. `main.py` explicitly intercepts any path beginning with `api/` and raises a clean JSON `HTTPException(status_code=404)`.

#### G. Weaknesses and Improvements
- **Weakness:** If model loading fails during `lifespan`, the server starts in a degraded state (`app.state.predictor = None`), leaving the application running but returning 503 on analysis routes.
- **Improvement:** In a Kubernetes deployment, configure a startup liveness probe that fails container boot if `app.state.predictor` is `None`.

#### H. Evidence and Confidence
- `[VERIFIED]`: Directly corroborated by `backend/main.py:1-209` and passing verification in `test_e2e_full.py:26-41`.

---

### File: `backend/config.py`

#### A. Purpose
Centralizes all global configuration settings, filesystem paths, deep learning hyperparameters, uncertainty thresholds, risk weights, and security environment variables into a single, type-safe Python module. `[VERIFIED: lines 1-101]`

#### B. Important Code
- **Paths** (lines 9-14): `BASE_DIR`, `DATA_ROOT`, `TRAIN_DIR`, `TEST_DIR`, `MODEL_SAVE_PATH`.
- **Classes** (lines 17-25): `CLASS_NAMES = ["glioma", "meningioma", "notumor", "pituitary"]`.
- **Hyperparameters** (lines 27-34): `IMG_SIZE = 224`, `BATCH_SIZE = 16`, `NUM_EPOCHS = 10`, `LEARNING_RATE = 1e-4`, `VAL_SPLIT = 0.15`.
- **Uncertainty & Risk** (lines 37-47): `MC_DROPOUT_PASSES = 50`, `UNCERTAINTY_LOW = 0.05`, `UNCERTAINTY_HIGH = 0.15`, `RISK_WEIGHTS = {"glioma": 0.9, "meningioma": 0.6, "pituitary": 0.5, "notumor": 0.05}`.
- **Security Limits** (lines 58-86): `AUTH_SECRET`, `TOKEN_EXPIRY_SECONDS = 604800` (7 days), `MAX_UPLOAD_SIZE_BYTES = 26214400` (25 MB).

#### C. Logical-Block Explanation
1. **Path Normalization (lines 8-15):** Resolves directory paths relative to `__file__`, ensuring absolute path portability regardless of the working directory from which Uvicorn is invoked.
2. **Clinical Taxonomy (lines 16-25):** Establishes the canonical 4-class multi-classification mapping used uniformly across datasets, models, databases, and frontend displays.
3. **Training & Inference Hyperparameters (lines 26-56):** Freezes image normalization constants to ImageNet standards (`IMAGENET_MEAN = [0.485, 0.456, 0.406]`, `IMAGENET_STD = [0.229, 0.224, 0.225]`).
4. **Environment & Security Constants (lines 57-100):** Reads configuration from environment variables via `os.getenv()`, providing safe fallback defaults for local development while permitting production override via Docker `.env`.

#### D. Inputs and Outputs
- **Inputs:** OS environment variables (`ENVIRONMENT`, `DATABASE_URL`, `NEUROSCAN_AUTH_SECRET`, `CORS_ORIGINS`).
- **Outputs:** Strongly typed constant values imported across backend modules.

#### E. Dependencies
- Relies on: `os`, `pathlib.Path`.
- Depended on by: Almost every backend module (`main.py`, `database.py`, `auth.py`, `predictor.py`, `train_classifier.py`).

#### F. Interview Relevance
- **Q:** *Why is it critical to enforce ImageNet mean and standard deviation normalization during MRI inference?*  
  **A:** The convolutional layers of ResNet-50 and the patch embedding layers of Swin Transformer were pre-trained on ImageNet. Input tensors must match the exact numerical distribution ($\mu, \sigma$) the weights were optimized for; otherwise, feature activation maps and BatchNorm statistics degrade significantly.

#### G. Weaknesses and Improvements
- **Weakness:** Fallback secret key (`neuroscan_ai_clinical_secure_token_secret_2026_key`) is hardcoded if `NEUROSCAN_AUTH_SECRET` is unset.
- **Improvement:** In production mode (`ENVIRONMENT == "production"`), raise an immediate `RuntimeError` if the secret key is missing or matches the default placeholder.

#### H. Evidence and Confidence
- `[VERIFIED]`: Code inspected in `backend/config.py:1-101`.

---

### File: `backend/database.py`

#### A. Purpose
Defines the relational database architecture using SQLAlchemy 2.0 ORM. Configures connection pooling, declarative table schemas, entity relationships, cascade behaviors, indexing, database initialization DDL, and automatic seeding of default hospital staff accounts. `[VERIFIED: lines 1-348]`

#### B. Important Code
- **Engine & Pool Configuration** (lines 29-46): Sets `check_same_thread=False` for SQLite and connection pool parameters (`pool_size=10`, `max_overflow=20`, `pool_pre_ping=True`) for PostgreSQL.
- **ORM Models** (lines 51-244):
  - `User`: Hospital staff credentials, roles (`doctor`, `technician`, `admin`), PBKDF2 hash, active status.
  - `Patient`: Institutional patient identity (`patient_code`), demographics, hospital association.
  - `Scan`: Raw MRI metadata, upload file path, status (`completed`, `failed`), archival flag.
  - `Analysis`: Comprehensive ML inference payload, classification probabilities, uncertainty tier, entropy, risk score, base64 segmentation mask, four base64 XAI overlays, radiomics JSON, and clinical narrative.
  - `Case`: Clinical review board entity linking patient, scan, and analysis with assigned physician, priority (`low`, `medium`, `high`, `urgent`), and status (`active`, `under_review`, `completed`).
  - `DiagnosticReport`: Formal diagnostic document linking scan, case, and doctor with title, summary, full text, and revision version number.
  - `AuditLog`: Immutable regulatory audit log capturing `user_id`, `username`, `role`, `action`, `resource_type`, `resource_id`, `details`, `ip_address`, `user_agent`, and `timestamp`.
  - `Notification`: Role-targeted and user-specific in-app clinical alerts.
  - `EmailOTP`: 6-digit hashed one-time verification tokens with expiry and attempt throttling.
- **`create_tables()` & `_seed_default_users()`** (lines 279-340): Automatically generates tables on startup and seeds default accounts (`doctor`, `tech`, `admin`).
- **`get_db()`** (lines 342-348): Standard FastAPI dependency yielding managed SQLAlchemy sessions with automatic closure.

#### C. Logical-Block Explanation
1. **Engine Setup (lines 24-46):** Detects whether the dialect is SQLite or PostgreSQL. SQLite requires disabling thread checking for concurrent FastAPI async workers. PostgreSQL utilizes a pre-ping connection pool to detect dropped connections.
2. **Schema Declarations (lines 48-244):** Declares 9 entity tables using standard SQL types (`String`, `Integer`, `Float`, `Boolean`, `Text`, `DateTime`, `ForeignKey`). Foreign keys enforce referential integrity with explicit cascade options (`cascade="all, delete-orphan"` on `Patient.scans` and `Scan.analysis`). Indexes are placed on frequent lookup keys (`username`, `email`, `patient_code`, `case_number`, `created_at`, `timestamp`).
3. **Seeding Logic (lines 284-340):** Queries the `User` table for existing default usernames. If missing, hashes default passwords via `auth.hash_password()` and commits the baseline staff roster.

#### D. Inputs and Outputs
- **Inputs:** Database transactions, query filters, entity instantiations.
- **Outputs:** Database session generator, ORM model instances, persisted database rows.

#### E. Dependencies
- Relies on: `sqlalchemy`, `backend/config.py`, `backend/auth.py` (for password hashing during seeding).
- Depended on by: `backend/main.py`, `backend/auth.py`, and all API route files.

#### F. Interview Relevance
- **Q:** *Why use UUID strings for Primary Keys instead of auto-incrementing integers?*  
  **A:** Auto-incrementing integers leak record velocity (allowing attackers to guess patient volume) and create merge collisions in distributed, replicated, or sharded database architectures. UUID4 provides cryptographically random, collision-proof primary keys across distributed systems.
- **Q:** *Why is `pool_pre_ping=True` critical for enterprise databases like PostgreSQL?*  
  **A:** Cloud database connections (AWS RDS, Azure Database) often disconnect idle connections via TCP timeout. `pool_pre_ping=True` executes an internal test query (like `SELECT 1`) before handing the connection to the application, transparently recycling dead connections and preventing `OperationalError: server closed the connection unexpectedly`.

#### G. Weaknesses and Improvements
- **Weakness:** Complex analytical payloads (`class_probabilities_json`, `xai_faithfulness_json`) are stored as serialized `Text` strings rather than native PostgreSQL `JSONB`.
- **Improvement:** In PostgreSQL, migrate `Text` JSON columns to `JSONB` to enable native database indexing on specific keys (e.g., querying all scans where `class_probabilities->>'glioma' > 0.85`).

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `backend/database.py:1-348`; database inspection verified all 9 tables present in `neurovision.db`.

---

### File: `backend/auth.py`

#### A. Purpose
Implements the core authentication, authorization, and cryptographic security primitives for NeuroVision. Manages password hashing and verification, signed token generation, sliding-window rate limiting, role-based access control (RBAC) dependency factories, and audit logging. `[VERIFIED: lines 1-253]`

#### B. Important Code
- **`check_rate_limit(key, max_requests=5, window_seconds=300)`** (lines 36-51): Sliding-window in-memory request counter by IP/key.
- **`validate_password_strength(password: str)`** (lines 55-68): Enforces production complexity (minimum 8 chars, at least one letter, at least one digit).
- **`hash_password(password: str)`** (lines 71-75): Derives cryptographic hash using `hashlib.pbkdf2_hmac("sha256", ..., salt=16 bytes, iterations=100,000)`. Formatted as `base64(salt):base64(derived_key)`.
- **`verify_password(plain, hashed)`** (lines 78-91): Extracts salt and key; verifies candidate password using constant-time comparison `hmac.compare_digest`.
- **`create_token(user_id, username, role)`** (lines 116-128): Constructs base64url JSON payload (`sub`, `username`, `role`, `iat`, `exp`) and appends an HMAC-SHA256 signature signed by `AUTH_SECRET`.
- **`decode_token(token: str)`** (lines 130-146): Validates token structure, recalculates expected HMAC signature, performs timing-safe digest comparison, and enforces expiration timestamps.
- **`get_current_user(...)`** (lines 162-189): FastAPI dependency extracting token from either `Authorization: Bearer <token>` or `auth_token` cookie, returning active `User` record or raising HTTP 401.
- **`require_role(allowed_roles: List[str])`** (lines 206-216): Dependency factory verifying that the authenticated user's role is authorized, raising HTTP 403 Forbidden on violation.
- **`log_audit_event(...)`** (lines 220-253): Appends a structured audit event into `audit_logs` with client IP and user-agent string.

#### C. Logical-Block Explanation
1. **Rate Limiting (lines 32-51):** Maintains an in-memory dictionary of timestamp lists. Evicts timestamps older than `window_seconds`. If request count exceeds `max_requests`, blocks further execution.
2. **Password Cryptography (lines 53-91):** Implements NIST-compliant PBKDF2-HMAC-SHA256. Every password receives a cryptographically random 16-byte salt from `os.urandom(16)`. The 100,000 iteration count protects against GPU-accelerated dictionary attacks. Constant-time comparison prevents side-channel timing attacks.
3. **Token Architecture (lines 114-147):** Custom lightweight signed token implementation. Packages claims in JSON, base64url-encodes the payload, and signs with HMAC-SHA256 using the server secret. The signature prevents client-side tampering of claims (e.g., modifying `role` from `technician` to `admin`).
4. **FastAPI Authorization Guards (lines 148-216):** Flexible token extraction accommodates both automated API clients (passing Bearer headers) and web browser SPAs (passing `HttpOnly` session cookies). `require_role` returns a callable dependency that checks `user.role in allowed_roles`.
5. **Security Audit Logger (lines 218-253):** Encapsulates audit record creation. Captures caller IP from `request.client.host` and user-agent from headers. Commits to the database within an isolated `try...except` block so audit logging failures never crash the primary clinical workflow.

#### D. Inputs and Outputs
- **Inputs:** Plaintext passwords, authentication tokens, incoming HTTP request context, user credentials.
- **Outputs:** Hashed strings, signed JWT tokens, authenticated `User` ORM models, audit log database entries.

#### E. Dependencies
- Relies on: `hashlib`, `hmac`, `secrets`, `base64`, `fastapi`, `backend/database.py`, `backend/config.py`.
- Depended on by: All API routers (`routes_auth.py`, `routes_users.py`, `routes_scans.py`, etc.).

#### F. Interview Relevance
- **Q:** *Why is `hmac.compare_digest` used instead of standard `==` string equality?*  
  **A:** Standard string equality (`a == b`) terminates comparison at the first mismatched byte, creating measurable variations in execution time. Attackers exploit this timing leakage to iteratively guess valid password hashes or signatures byte-by-byte. `hmac.compare_digest` compares all bytes in constant time regardless of where differences occur, completely neutralizing timing attacks.
- **Q:** *How does your role-based access control handle privilege escalation?*  
  **A:** Role claims are signed inside the HMAC-SHA256 token signature. If a malicious user alters the base64-encoded `role` field from `technician` to `admin`, the recalculated signature fails verification in `decode_token`, immediately invalidating the session. Furthermore, every protected endpoint verifies the user's role against the active database record via `require_role(["admin"])`.

#### G. Weaknesses and Improvements
- **Weakness:** Rate limiting store (`_RATE_LIMIT_STORE`) is held in process memory. Restarting the server clears the rate limit state, and multiple load-balanced workers do not share rate-limiting counters.
- **Improvement:** Migrate rate-limiting counters to an external Redis instance using the Token Bucket or Sliding Window Log algorithm via Redis `ZADD` and `EXPIRE`.

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `backend/auth.py:1-253`; verified by RBAC enforcement tests in `test_e2e_full.py:123-138` (technician getting 403 on `/api/users` and `/api/audit`).

---

### File: `backend/email_service.py`

#### A. Purpose
Handles transactional email delivery and 6-digit numeric OTP notifications via SMTP with TLS encryption. Features a mock fallback mode that logs OTP codes to the server terminal during local development without crashing if SMTP credentials are not configured. `[VERIFIED: lines 1-104]`

#### B. Important Code
- **`is_smtp_configured()`** (lines 19-21): Evaluates whether `SMTP_HOST`, `SMTP_PORT`, and `SMTP_FROM` are set.
- **`send_otp_email(to_email, otp_code, purpose="login")`** (lines 24-104): Generates an HTML-formatted clinical email template and delivers it via `smtplib.SMTP`.

#### C. Logical-Block Explanation
1. **Configuration Probe (lines 19-22):** Checks for presence of minimal SMTP settings.
2. **Template Synthesis (lines 29-70):** Assembles a responsive, dark-themed clinical notification email displaying the 6-digit verification code with institutional branding.
3. **Graceful Development Fallback (lines 72-76):** If SMTP is unconfigured, prints the OTP directly to standard output (`[MOCK DISPATCH] OTP for user@neuroscan.ai: >>> 123456 <<<`) and returns `True`, allowing developers to test authentication flows seamlessly offline.
4. **SMTP Transmission (lines 77-104):** Connects to the mail server, initiates TLS handshake via `server.starttls()`, authenticates with user credentials, dispatches the email, and safely terminates the connection.

#### D. Inputs and Outputs
- **Inputs:** Destination email address (`to_email`), 6-digit string (`otp_code`), notification context (`purpose`).
- **Outputs:** Boolean status (`True` if sent/mocked, `False` on connection failure).

#### E. Dependencies
- Relies on: `smtplib`, `email.mime.text`, `email.mime.multipart`, `backend/config.py`.
- Depended on by: `backend/api/routes_auth.py`.

#### F. Interview Relevance
- **Q:** *Why is a mock fallback mode preferable to throwing an exception when email configuration is missing in development?*  
  **A:** It decouples local development and automated CI testing from external SMTP infrastructure dependencies, preventing local onboarding failures while keeping the production delivery path fully intact.

#### G. Weaknesses and Improvements
- **Weakness:** SMTP connection and delivery are executed synchronously on the request thread. If the SMTP server experiences network latency (e.g., 5-second timeout), the client's HTTP request hangs.
- **Improvement:** Offload email dispatch to an asynchronous background task using FastAPI's `BackgroundTasks` or a Celery worker.

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `backend/email_service.py:1-104`.

---

## 2. Machine Learning, Inference & Scientific Computing

---

### File: `backend/models/hybrid_classifier.py`

#### A. Purpose
Defines the deep learning classification model architecture for NeuroVision: an attention-gated dual-branch hybrid fusing localized CNN representations from ResNet-50 with global self-attention representations from Swin Transformer. Also implements all three ablation architectures (`CNNOnlyClassifier`, `ViTOnlyClassifier`, `SimpleConcatClassifier`) and a Label Smoothing Cross-Entropy loss function. `[VERIFIED: lines 1-206]`

#### B. Important Code
- **`enable_dropout(model: nn.Module)`** (lines 19-24): Traverses all submodules and forces `nn.Dropout` into `.train()` mode for Monte Carlo uncertainty estimation.
- **`AttentionFusion(nn.Module)`** (lines 28-70):
  - Fuses 2048-dim CNN features with 768-dim ViT features into a 2816-dim representation.
  - Learns scalar gating weight $\alpha \in [0, 1]$: `attn_gate = Linear(2816, 256) -> ReLU -> Linear(256, 1) -> Sigmoid`.
  - Classification head with three MC Dropout stages ($p=0.3$) and LayerNorm/GELU projections to 4 classes.
- **`HybridClassifier(nn.Module)`** (lines 74-116):
  - Branch A: ResNet-50 backbone up through average pooling (`(B, 2048, 1, 1)`).
  - Branch B: Swin Transformer Tiny (`swin_tiny_patch4_window7_224` via `timm`) returning a 768-dim vector.
  - Fusion: Fused via `AttentionFusion`. Stores target convolutional layer reference `resnet.layer4[-1]` for Grad-CAM.
- **Ablation Models** (lines 120-188):
  - `CNNOnlyClassifier`: ResNet-50 baseline.
  - `ViTOnlyClassifier`: Swin-Tiny baseline.
  - `SimpleConcatClassifier`: Dual-branch concatenation without the attention gating MLP.
- **`LabelSmoothingCrossEntropy(nn.Module)`** (lines 192-206): Regularized cross-entropy loss with $\epsilon = 0.1$ label smoothing.

#### C. Logical-Block Explanation
1. **Dual-Branch Feature Extraction (lines 74-107):** In the forward pass, an input image tensor $x \in \mathbb{R}^{B \times 3 \times 224 \times 224}$ is passed simultaneously through Branch A (ResNet-50 conv layers) producing feature vector $f_{\text{cnn}} \in \mathbb{R}^{B \times 2048}$ and Branch B (Swin-Tiny self-attention blocks) producing feature vector $f_{\text{vit}} \in \mathbb{R}^{B \times 768}$.
2. **Attention Gating Mechanism (lines 28-70):** Features are concatenated into $f_{\text{fused}} = [f_{\text{cnn}} \,\|\, f_{\text{vit}}] \in \mathbb{R}^{B \times 2816}$. The attention MLP calculates dynamic weighting factor:
   $$\alpha = \sigma(W_2 \cdot \text{ReLU}(W_1 \cdot f_{\text{fused}}))$$
   The classification head projects $f_{\text{fused}}$ through a deep MLP with LayerNorm, GELU non-linearities, and three separate 30% dropout layers:
   $$\text{Head}(f) = W_5 \cdot \text{Dropout}_{0.3}(\text{GELU}(\text{LN}(W_4 \cdot \text{Dropout}_{0.3}(\text{GELU}(\text{LN}(W_3 \cdot \text{Dropout}_{0.3}(f)))))))$$
3. **Ablation Implementations (lines 118-188):** Provides identical classification heads across all three ablation baselines to ensure rigorous, scientifically controlled comparisons during training and evaluation.
4. **Label Smoothing Loss (lines 190-206):** Replaces rigid one-hot target vectors $[0, 1, 0, 0]$ with softened target distributions $[0.033, 0.90, 0.033, 0.033]$, preventing the neural network from becoming overconfident on noisy training labels.

#### D. Inputs and Outputs
- **Inputs:** Normalized image batch tensor of shape `(B, 3, 224, 224)`.
- **Outputs:** Unnormalized logit tensor of shape `(B, 4)` representing classes: `glioma`, `meningioma`, `notumor`, `pituitary`. `forward_with_alpha()` additionally returns `alpha` tensor of shape `(B,)`.

#### E. Dependencies
- Relies on: `torch`, `torch.nn`, `torchvision.models`, `timm`.
- Depended on by: `backend/inference/predictor.py`, `backend/training/train_classifier.py`, `backend/training/evaluate.py`.

#### F. Interview Relevance
- **Q:** *Why fuse a CNN with a Vision Transformer instead of using either architecture alone?*  
  **A:** CNNs possess strong inductive bias (translation equivariance and locality), making them superior at detecting fine-grained local textures like necrotic tissue boundaries or micro-calcifications. Vision Transformers lack strong spatial inductive bias but model global contextual relationships across the entire brain hemisphere using multi-head self-attention. Combining both allows the model to leverage local pathology cues while maintaining global structural awareness.
- **Q:** *How does Label Smoothing improve model calibration?*  
  **A:** Standard cross-entropy with hard one-hot targets encourages logits to grow infinitely large, causing Softmax to output probabilities near 1.0 even when predictions are uncertain. Label smoothing bounds logit magnitudes, penalizing extreme overconfidence and significantly reducing Expected Calibration Error (ECE).

#### G. Weaknesses and Improvements
- **Weakness:** In `AttentionFusion.forward()`, the computed scalar `alpha` scales internal intermediate features, but the classifier head receives the raw concatenated `fused` vector directly (`logits = self.classifier(fused)`).
- **Improvement:** Concatenate the scaled representations directly: `fused_scaled = torch.cat([alpha * cnn_feat, (1 - alpha) * vit_feat], dim=1)` and pass `fused_scaled` into `self.classifier`.

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `backend/models/hybrid_classifier.py:1-206`; ablation summary in `saved_models/ablation_summary.json` confirms all 4 variants were trained and evaluated.

---

### File: `backend/models/attention_unet.py`

#### A. Purpose
Implements an Attention U-Net segmentation model for delineating brain tumor boundaries. Features a pre-trained ResNet-34 encoder, decoder up-sampling blocks with additive attention gates, and a combined Dice + Binary Cross-Entropy loss function. `[VERIFIED: lines 1-151]`

#### B. Important Code
- **`ConvBNReLU`** (lines 19-33): Standard double convolutional block with Batch Normalization and ReLU.
- **`AttentionGate(nn.Module)`** (lines 35-58):
  - Additive attention gate filtering encoder skip connections.
  - Takes gating signal $g$ from decoder and skip feature map $x$ from encoder.
  - Computes spatial attention map $\psi = \sigma(W_\psi \cdot \text{ReLU}(W_g \cdot g + W_x \cdot x))$ and returns $\psi \odot x$.
- **`UpBlock(nn.Module)`** (lines 60-75): Transposed convolution upsampling combined with `AttentionGate` skip-connection fusion.
- **`AttentionUNet(nn.Module)`** (lines 79-132):
  - Encoder: First 4 layer groups of ResNet-34 (`enc0`, `enc1`, `enc2`, `enc3`, `enc4`).
  - Bridge: `ConvBNReLU(512, 512)`.
  - Decoder: 4 cascading `UpBlock` stages with attention gates (`up4`, `up3`, `up2`, `up1`).
  - Output: Single-channel Sigmoid probability mask of shape `(B, 1, 224, 224)`.
- **`DiceBCELoss(nn.Module)`** (lines 135-151): Composite loss combining standard BCE with smooth Dice loss.

#### C. Logical-Block Explanation
1. **Additive Attention Gate (lines 35-58):** Standard U-Net skip connections transfer low-level feature maps directly from encoder to decoder, often introducing irrelevant background noise. The attention gate uses the coarser, higher-level gating signal $g$ from the decoder to suppress activations in healthy brain regions while highlighting activations around tumor margins:
   $$\text{Attn}(g, x) = \sigma(\text{Conv}_{1\times 1}(\text{ReLU}(\text{Conv}_{1\times 1}(g) + \text{Conv}_{1\times 1}(x)))) \odot x$$
2. **Encoder-Decoder Architecture (lines 79-132):** Exploits a pre-trained ResNet-34 backbone to extract multi-scale spatial representations at $\frac{1}{2}, \frac{1}{4}, \frac{1}{8}, \frac{1}{16},$ and $\frac{1}{32}$ resolutions. The decoder reconstructs spatial resolution through transposed convolutions, passing skip features through attention gates at each stage.
3. **Dice + BCE Loss (lines 134-151):** Binary Cross-Entropy calculates per-pixel error but struggles with severe class imbalance (where healthy brain pixels outnumber tumor pixels 20:1). Dice loss directly optimizes the intersection-over-union:
   $$\mathcal{L}_{\text{Dice}} = 1 - \frac{2 |Y \cap \hat{Y}| + 1}{|Y| + |\hat{Y}| + 1}$$
   Combining $\mathcal{L}_{\text{BCE}} + \mathcal{L}_{\text{Dice}}$ balances smooth gradient descent with overlap optimization.

#### D. Inputs and Outputs
- **Inputs:** Image tensor of shape `(B, 3, 224, 224)`.
- **Outputs:** Single-channel binary probability mask tensor of shape `(B, 1, 224, 224)` with values in $[0, 1]$.

#### E. Dependencies
- Relies on: `torch`, `torch.nn`, `torch.nn.functional`, `torchvision.models.resnet34`.
- Depended on by: `backend/inference/predictor.py`, `backend/training/train_segmentation.py`.

#### F. Interview Relevance
- **Q:** *Why is pure Binary Cross-Entropy (BCE) inadequate for medical image segmentation?*  
  **A:** Medical segmentation suffers from extreme foreground-background class imbalance. If a tumor occupies only 3% of the MRI slice, a model predicting "all background" achieves 97% BCE accuracy while failing completely. Dice loss penalizes false negatives and false positives relative to the actual tumor area, directly optimizing the Sorensen-Dice coefficient.

#### G. Weaknesses and Improvements
- **Weakness:** The model outputs a single binary mask channel without differentiating multi-compartment tumor sub-regions (e.g., enhancing tumor core vs. peritumoral edema vs. necrotic core).
- **Improvement:** Expand output channels to 3 to support multi-class BraTS segmentation protocols (Whole Tumor, Tumor Core, Enhancing Tumor).

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `backend/models/attention_unet.py:1-151`; weights confirmed saved at `saved_models/attention_unet_best.pth` (117 MB).

---

### File: `backend/inference/predictor.py`

#### A. Purpose
The operational orchestrator of the entire inference pipeline. Loads model checkpoints into memory, normalizes incoming MRI scans, coordinates the execution of Monte Carlo uncertainty estimation, Attention U-Net segmentation, four XAI attribution methods, radiomics extraction, risk stratification, and automated clinical report generation into a single unified JSON response. `[VERIFIED: lines 1-347]`

#### B. Important Code
- **`_pick_best_model()`** (lines 45-65): Parses `ablation_summary.json` to automatically load the highest-performing ablation checkpoint.
- **`NeuroVisionPredictor.__init__()`** (lines 93-136): Instantiates and loads weights for the classifier, U-Net, `MCDropoutPredictor`, `XAIEngine`, `XAIEvaluator`, and `RadiomicsExtractor`.
- **`predict(image: Image.Image, filename)`** (lines 139-297): Full inference pipeline executing 8 sequential analytical stages and returning a comprehensive dictionary.
- **`_run_segmentation()`** (lines 300-340): Executes Attention U-Net forward pass, thresholds at 0.5, calculates pixel counts, and generates an alpha-blended heatmap overlay.

#### C. Logical-Block Explanation
1. **Dynamic Model Discovery (lines 45-65):** Reads `saved_models/ablation_summary.json`. If `best_model` indicates `concat_no_attn`, it dynamically instantiates `SimpleConcatClassifier` and loads `concat_no_attn_best.pth`.
2. **Preprocessing (lines 68-90):** Converts incoming PIL images to RGB, resizes to $224 \times 224$, converts to a normalized PyTorch tensor, and prepares base64 encoding helpers.
3. **Execution Pipeline (lines 139-207):**
   - **Step 1:** Executes `MCDropoutPredictor` (50 passes) $\rightarrow$ class, confidence, uncertainty $\sigma$, entropy.
   - **Step 2:** Executes `XAIEngine` $\rightarrow$ Grad-CAM, Grad-CAM++, Score-CAM, Integrated Gradients overlays.
   - **Step 3:** Executes `_run_segmentation` $\rightarrow$ Attention U-Net mask, area in pixels, volume percentage.
   - **Step 4:** Executes `RadiomicsExtractor` $\rightarrow$ 13 intensity and GLCM texture features.
   - **Step 5:** Executes `compute_risk_score` $\rightarrow$ composite risk index (`LOW`, `MEDIUM`, `HIGH`).
   - **Step 6:** Executes `XAIEvaluator` $\rightarrow$ Pointing Game and Pixel Flipping faithfulness scores.
   - **Step 7:** Executes `generate_clinical_report` $\rightarrow$ structured text radiology narrative.
4. **Response Assembly (lines 209-297):** Constructs the unified dictionary matching the frontend `AnalysisData` interface (`frontend/shared/schema.ts`). Includes execution timing breakdowns for telemetry.

#### D. Inputs and Outputs
- **Inputs:** Raw PIL Image object, filename string.
- **Outputs:** Comprehensive serialized dictionary containing predictions, uncertainty metrics, base64 overlays, radiomic biomarkers, risk levels, and clinical report text.

#### E. Dependencies
- Relies on: `torch`, `PIL`, `numpy`, `cv2`, all sub-modules (`hybrid_classifier`, `attention_unet`, `uncertainty`, `risk_stratifier`, `xai_engine`, `radiomics_extractor`, `report_generator`).
- Depended on by: `backend/main.py`, `backend/api/routes_scans.py`, `backend/api/routes_predict.py`, `test_pipeline.py`.

#### F. Interview Relevance
- **Q:** *How does `predictor.py` ensure thread-safe inference in a multi-threaded web server environment?*  
  **A:** All PyTorch forward passes are wrapped in `torch.no_grad()` contexts to prevent gradient accumulation. The predictor operates in evaluation mode (`eval()`), meaning model weights remain immutable during request processing.

#### G. Weaknesses and Improvements
- **Weakness:** If an MRI is classified as `notumor`, `_run_segmentation` short-circuits and skips U-Net execution, returning a zeroed mask. If the classifier produced a false-negative classification, the clinician misses potential segmentation data.
- **Improvement:** Execute U-Net unconditionally and cross-reference U-Net non-zero pixel volume with the classifier prediction to detect and flag classification-segmentation discordance.

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `backend/inference/predictor.py:1-347`; end-to-end execution verified in `test_pipeline.py:1-73` and `test_e2e_full.py:54-92`.

---

### File: `backend/inference/uncertainty.py`

#### A. Purpose
Implements Bayesian approximation via Monte Carlo Dropout. Executes 50 stochastic forward passes with active dropout layers to compute probability variance, standard deviation ($\sigma$), predictive Shannon entropy, and categorical uncertainty tiers (`LOW`, `MEDIUM`, `HIGH`). `[VERIFIED: lines 1-92]`

#### B. Important Code
- **`enable_dropout(model: nn.Module)`** (lines 18-23): Recursively sets all `nn.Dropout` modules to `.train()` mode while leaving `BatchNorm` layers in `.eval()` mode.
- **`predict_with_uncertainty(image_tensor, n_passes=50)`** (lines 30-92):
  - Iterates 50 forward passes collecting softmax probability vectors.
  - Computes mean probability $\mu$ and standard deviation $\sigma$.
  - Computes Shannon entropy: $H(P) = -\sum_{i=1}^4 p_i \ln(p_i + 10^{-8})$.
  - Assigns uncertainty tiers based on thresholds: $\sigma < 0.05 \rightarrow$ `LOW`, $\sigma > 0.15 \rightarrow$ `HIGH`.

#### C. Logical-Block Explanation
1. **Dropout Activation (lines 18-23):** Standard PyTorch `model.eval()` disables dropout entirely. `enable_dropout()` selectively reactivates dropout layers so that during each forward pass, a random 30% subset of neurons in the classification head is deactivated.
2. **Stochastic Sampling (lines 44-58):** Passes the identical image tensor through the network 50 times. Because different random neurons are dropped out in each pass, the network samples 50 distinct functional sub-networks from the implicit ensemble:
   $$P = \{p^{(1)}, p^{(2)}, \dots, p^{(50)}\}, \quad p^{(k)} = \text{Softmax}(\text{Model}(x))$$
3. **Statistical Aggregation (lines 56-66):** Calculates the mean probability vector $\mu = \frac{1}{50} \sum p^{(k)}$ and standard deviation vector $\sigma$. Predictive entropy $H(P)$ measures overall distributional dispersion in units of nats.
4. **Clinical Triage Thresholding (lines 67-81):** Categorizes uncertainty against validated thresholds:
   - $\sigma < 0.05$: `LOW` tier ("High confidence prediction. Model is certain.")
   - $0.05 \le \sigma \le 0.15$: `MEDIUM` tier ("Moderate uncertainty. Consider corroborating with clinical findings.")
   - $\sigma > 0.15$: `HIGH` tier ("High uncertainty. Radiologist review strongly recommended.")

#### D. Inputs and Outputs
- **Inputs:** Preprocessed image tensor of shape `(1, 3, 224, 224)`, number of passes (default 50).
- **Outputs:** Dictionary containing `predicted_class`, `confidence`, `uncertainty` ($\sigma$), `entropy`, `uncertainty_tier`, and `clinical_flag`.

#### E. Dependencies
- Relies on: `torch`, `numpy`, `backend/config.py`.
- Depended on by: `backend/inference/predictor.py`.

#### F. Interview Relevance
- **Q:** *Why is Monte Carlo Dropout considered a Bayesian approximation?*  
  **A:** Gal and Ghahramani (2016) proved mathematically that training a neural network with dropout is mathematically equivalent to variational inference in a deep Gaussian process. Keeping dropout active at test time samples from the approximate posterior distribution over network weights, allowing us to quantify epistemic (model) uncertainty without training costly Bayesian neural networks.
- **Q:** *What is the difference between Confidence and Uncertainty?*  
  **A:** Confidence is the maximum Softmax output ($p_{\max} \in [0, 1]$) from a single pass. A model can be overconfident on out-of-distribution noise (e.g., Softmax = 0.98). Uncertainty ($\sigma$) measures variance across stochastic passes. If $\sigma$ is high despite high confidence, it reveals that small perturbations drastically shift the model's decision, exposing fragility that standard Softmax conceals.

#### G. Weaknesses and Improvements
- **Weakness:** Running 50 sequential forward passes on CPU adds ~400ms of latency.
- **Improvement:** Tile the input tensor along the batch dimension: `batch = image_tensor.repeat(50, 1, 1, 1)` and execute all 50 stochastic passes in a single batched parallel GPU forward pass, reducing execution time to <20ms.

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `backend/inference/uncertainty.py:1-92`; verified in `test_pipeline.py:55` and `test_e2e_full.py:80`.

---

### File: `backend/inference/risk_stratifier.py`

#### A. Purpose
Implements the clinical risk stratification engine that calculates a composite numerical risk score from pathology severity, tumor volume, predictive uncertainty, and model confidence, translating raw predictions into actionable clinical triage priorities. `[VERIFIED: lines 1-85]`

#### B. Important Code
- **`compute_risk_score(prediction_result, segmentation_area_pixels, image_size=224)`** (lines 16-85):
  - Base pathology weight: `glioma: 0.9`, `meningioma: 0.6`, `pituitary: 0.5`, `notumor: 0.05`.
  - Size factor: $\min(\text{tumor\_pixels} / (224 \times 224), 1.0)$.
  - Uncertainty penalty: $\sigma \times 0.3$.
  - Composite score formula:
    $$\text{Score} = (0.5 \times \text{BaseRisk} + 0.3 \times \text{SizeFactor} + 0.2 \times \text{UncertaintyPenalty}) \times \text{Confidence}$$
  - Stratification tiers: $>0.65 \rightarrow$ `HIGH` (urgent referral), $>0.35 \rightarrow$ `MEDIUM`, $\le 0.35 \rightarrow$ `LOW`.

#### C. Logical-Block Explanation
1. **Weight Retrieval (lines 30-35):** Looks up base histological malignancy weight from `config.RISK_WEIGHTS`. Gliomas carry the highest baseline risk (0.9) due to their aggressive infiltrative nature.
2. **Volumetric & Uncertainty Penalties (lines 36-41):** Calculates tumor spatial coverage proportion. Applies an uncertainty penalty ($\sigma \times 0.3$), embodying the clinical safety rule: *ambiguity increases clinical risk*.
3. **Composite Index Calculation (lines 42-50):** Combines the three factors weighted 50% pathology, 30% volume, and 20% uncertainty, modulated by model confidence.
4. **Triage Thresholding & Recommendations (lines 51-85):** Maps score to categorical tiers with explicit clinical recommendations and follow-up timelines (e.g., immediate neurosurgical consultation within 48 hours for `HIGH`).

#### D. Inputs and Outputs
- **Inputs:** `prediction_result` dict from `MCDropoutPredictor`, `segmentation_area_pixels` integer, image dimension integer.
- **Outputs:** Dictionary containing `score`, `level` (`LOW`, `MEDIUM`, `HIGH`), `color`, `recommendation`, and `followup`.

#### E. Dependencies
- Relies on: `backend/config.py`.
- Depended on by: `backend/inference/predictor.py`.

#### F. Interview Relevance
- **Q:** *Why multiply the composite risk score by Confidence?*  
  **A:** If a model predicts Glioma (base risk 0.9) but confidence is only 30% (suggesting potential misclassification), scaling by confidence tempers false alarms while high uncertainty triggers elevated human review.

#### G. Weaknesses and Improvements
- **Weakness:** The linear coefficients (0.5, 0.3, 0.2) are heuristic expert-defined weights rather than statistically fitted regression parameters.
- **Improvement:** Calibrate weighting coefficients using clinical outcome survival data (e.g., Overall Survival in days from TCGA-GBM datasets) via a Cox Proportional Hazards regression model.

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `backend/inference/risk_stratifier.py:1-85`; verified in `test_e2e_full.py:81` and `routes_scans.py:301`.

---

### File: `backend/radiomics/radiomics_extractor.py`

#### A. Purpose
A pure Python, NumPy, SciPy, and Scikit-Image radiomics engine that extracts 13 mathematical image biomarkers from segmented tumor regions and ranks them via SHAP feature importance using an XGBoost classifier. Completely eliminates the legacy C++ `pyradiomics` dependency for seamless cross-platform Python 3.10-3.13 compatibility. `[VERIFIED: lines 1-316]`

#### B. Important Code
- **`FEATURE_MEDICAL_MEANING`** (lines 20-35): Medical clinical definitions for all 13 features.
- **`_extract_first_order(region_pixels)`** (lines 37-65): Computes Mean, Variance, Skewness, Kurtosis, and Shannon intensity entropy via histogram discretization.
- **`_extract_glcm(region_gray)`** (lines 67-102): Discretizes into 16 gray levels; computes Gray-Level Co-occurrence Matrix (GLCM) at distances 1 and 2 across 4 angles ($0, \frac{\pi}{4}, \frac{\pi}{2}, \frac{3\pi}{4}$); extracts Contrast, Correlation, Energy, Homogeneity.
- **`_extract_shape(mask)`** (lines 104-137): Computes Area, Perimeter, Elongation (minor/major axis ratio), and Solidity (area / convex hull area).
- **`RadiomicsExtractor` class** (lines 166-306):
  - `fit(images, masks, labels)`: Trains an XGBoost classifier on feature vectors and initializes `shap.TreeExplainer`.
  - `extract_features(image_np, mask_np)`: Extracts all 13 features, computes normalized values, calculates SHAP importance, and returns top 10 ranked features.

#### C. Logical-Block Explanation
1. **Mask Extraction (lines 141-164):** Converts image to grayscale and applies the binary segmentation mask. If the mask contains fewer than 10 pixels (healthy scan or failed mask), falls back to the full brain slice.
2. **First-Order Intensity Statistics (lines 37-65):** Normalizes masked pixel intensities to $[0, 1]$. Variance indicates tissue heterogeneity; Skewness measures distribution asymmetry; Kurtosis measures tail peakedness (identifying calcified foci); Shannon entropy evaluates intensity disorder.
3. **GLCM Second-Order Texture Analysis (lines 67-102):** Quantizes grayscale intensities into 16 bins to accelerate matrix computation. Evaluates spatial frequency of pixel pairs. Contrast captures local structural variations; Energy measures textural uniformity; Homogeneity captures diagonal GLCM concentration.
4. **Morphological Shape Descriptors (lines 104-137):** Identifies the largest connected component in the mask. Measures boundary irregularity via perimeter and solidity; calculates elongation ratio.
5. **SHAP Feature Attribution (lines 248-287):** Passes the 13-dimensional vector into `shap.TreeExplainer` to calculate how strongly each individual biomarker drove the XGBoost model toward the predicted tumor class. Sorts features in descending order of absolute SHAP importance.

#### D. Inputs and Outputs
- **Inputs:** Grayscale or RGB image array (`HxW` or `HxWx3`), binary mask array (`HxW`).
- **Outputs:** List of dictionaries containing `name`, `norm_value`, `raw_value`, `shap`, `direction` (`up`/`down`), and `medical_meaning`.

#### E. Dependencies
- Relies on: `numpy`, `scipy.stats`, `skimage.feature.graycomatrix`, `skimage.measure.regionprops`, `xgboost`, `shap`.
- Depended on by: `backend/inference/predictor.py`.

#### F. Interview Relevance
- **Q:** *What is the clinical value of GLCM Contrast and Energy in tumor characterization?*  
  **A:** GLCM Contrast measures local intensity variations between neighboring pixels. High-grade glioblastomas exhibit high contrast due to internal necrosis, hypervascularity, and irregular cellular density. Conversely, GLCM Energy measures textural homogeneity; benign, slow-growing meningiomas typically exhibit uniform tissue density and high energy.
- **Q:** *Why replace `pyradiomics` with a pure NumPy/SciPy implementation?*  
  **A:** `pyradiomics` relies on legacy C extensions that fail to compile or wheel-install cleanly on modern Python versions (Python 3.12/3.13) and non-standard architectures without complex system toolchains. Writing pure NumPy/Scikit-Image algorithms achieves 100% platform portability while maintaining strict mathematical fidelity to IBSI (Image Biomarker Standardisation Initiative) definitions.

#### G. Weaknesses and Improvements
- **Weakness:** If the XGBoost explainer is not pre-fitted (`self._fitted == False`), the engine falls back to using normalized feature values as proxy SHAP importances.
- **Improvement:** Pre-fit the XGBoost model on the entire training set radiomics feature matrix and serialize the fitted explainer to disk (`saved_models/radiomics_xgb.json`) so real SHAP values are guaranteed available at startup.

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `backend/radiomics/radiomics_extractor.py:1-316`; output verified in `test_pipeline.py:59` (13 features extracted) and `test_e2e_full.py:91`.

---

### File: `backend/report/report_generator.py`

#### A. Purpose
A pure-Python clinical report generator that compiles model classifications, uncertainty metrics, segmentation volumes, radiomic biomarkers, and risk scores into a professional, structured radiology report. Entirely deterministic and operates without external LLMs or third-party cloud APIs. `[VERIFIED: lines 1-369]`

#### B. Important Code
- **`_TUMOR_NARRATIVE`** (lines 15-92): Clinically validated narrative blocks for `glioma`, `meningioma`, `pituitary`, and `notumor` detailing imaging characteristics, typical anatomical locations, WHO grading significance, and urgency.
- **Narrative Formatters** (lines 96-193):
  - `_confidence_phrase()`: Categorizes confidence into clinical phrasing ($>90\% \rightarrow$ "very high diagnostic confidence").
  - `_uncertainty_phrase()`: Synthesizes narrative on model consistency across stochastic passes.
  - `_risk_narrative()`: Formulates clinical escalation rationale.
  - `_radiomics_narrative()`: Translates top 3 SHAP biomarkers into clinical interpretation.
- **`generate_clinical_report(data: dict)`** (lines 222-368): Formats the complete multi-section radiology report with standardized header, findings, impression, and legal disclaimer.

#### C. Logical-Block Explanation
1. **Clinical Narrative Dictionary (lines 13-93):** Contains domain-accurate neuro-oncology descriptions. For example, meningioma describes "well-circumscribed, extra-axial mass with broad dural base," whereas glioma highlights "signal heterogeneity and ill-defined margins typical of infiltrative glial neoplasms."
2. **Dynamic Section Synthesizers (lines 94-220):** Evaluates numerical data inputs and selects corresponding conditional phrasing. Evaluates the top 3 radiomics features to describe tumor heterogeneity and boundary regularity.
3. **Document Assembly (lines 222-368):** Structures the output into 9 clinical radiology reporting sections:
   - Section 1: Patient & Exam Metadata
   - Section 2: Clinical Indication
   - Section 3: AI Technique & Acquisition Modality
   - Section 4: Primary Imaging Findings
   - Section 5: Volumetric & Spatial Assessment
   - Section 6: Quantitative Radiomic Biomarker Profile
   - Section 7: Bayesian Uncertainty & Diagnostic Confidence
   - Section 8: Risk Stratification & Clinical Recommendations
   - Section 9: Mandatory Medical & Legal Disclaimer

#### D. Inputs and Outputs
- **Inputs:** Dictionary containing `tumor_type`, `confidence`, `uncertainty`, `risk_level`, `top_radiomics_features`, `segmentation_area_percent`.
- **Outputs:** Multi-line plaintext string formatted as a standard institutional clinical radiology report.

#### E. Dependencies
- Relies on: `datetime`, `json` (Python standard library only).
- Depended on by: `backend/inference/predictor.py`, `backend/api/routes_reports.py`.

#### F. Interview Relevance
- **Q:** *Why choose a deterministic template engine over an LLM like GPT-4 for clinical report generation?*  
  **A:** In enterprise healthcare, clinical decision support software must comply with FDA/MDR regulations. LLMs are non-deterministic and prone to hallucination—inventing non-existent lesions or recommending incorrect drug dosages. A deterministic template engine guarantees that every sentence maps strictly to mathematical model outputs, ensures 100% repeatability, and guarantees zero PHI leakage to external cloud APIs.

#### G. Weaknesses and Improvements
- **Weakness:** Produces plain ASCII text rather than formatted medical PDF documents with embedded thumbnail overlays.
- **Improvement:** Integrate a headless PDF generator (like ReportLab or Weasyprint) to compile diagnostic reports into cryptographically signed PDF/A documents with hospital letterhead and side-by-side MRI/Grad-CAM thumbnails.

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `backend/report/report_generator.py:1-369`; report generation and download verified in `test_e2e_full.py:94-106`.

---

### File: `backend/xai/xai_engine.py`

#### A. Purpose
Generates four distinct Explainable AI (XAI) feature attribution heatmaps as base64-encoded PNG overlays: Grad-CAM, Grad-CAM++, Score-CAM, and Integrated Gradients. Enables radiologists to visually audit the neural reasoning behind every pathology classification. `[VERIFIED: lines 1-212]`

#### B. Important Code
- **`overlay_heatmap(rgb_np, cam, alpha=0.4)`** (lines 51-58): Blends normalized activation maps with raw MRI pixels using OpenCV `COLORMAP_JET`.
- **`XAIEngine._resolve_target_layers()`** (lines 71-83): Inspects model architecture to extract target convolutional layers (`resnet.layer4[-1]`).
- **`_run_gradcam()`** (lines 86-96): Standard first-order gradient-weighted class activation mapping via `pytorch_grad_cam`.
- **`_run_gradcam_plus()`** (lines 97-107): Second-order gradient-weighted CAM for improved localization of multiple lesion foci.
- **`_run_scorecam()`** (lines 108-118): Gradient-free perturbation attribution passing masked image activations through the model.
- **`_run_integrated_gradients()`** (lines 119-158): Axiomatic path-integral attribution using Captum with Gaussian noise baselines.
- **`generate_all(...)`** (lines 160-211): Orchestrates execution of all four attribution methods.

#### C. Logical-Block Explanation
1. **Target Layer Extraction (lines 71-83):** Class activation mapping requires access to the final convolutional feature maps before spatial pooling. The engine interrogates the model for `gradcam_target_layer` (pointing to the final bottleneck block of ResNet layer 4).
2. **Grad-CAM & Grad-CAM++ (lines 86-107):** Computes the gradient of the predicted class score $y^c$ with respect to feature activation maps $A^k$. Grad-CAM weights activations by global-average-pooled gradients $\alpha_k^c = \frac{1}{Z} \sum_i \sum_j \frac{\partial y^c}{\partial A_{ij}^k}$. Grad-CAM++ uses second- and third-order partial derivatives to weight individual pixels, improving localization when multiple distinct tumor nodules are present.
3. **Score-CAM (lines 108-118):** Completely avoids gradient instability by using activation maps as spatial masks, multiplying them element-wise with the input image, and measuring the resulting forward-pass score increase.
4. **Integrated Gradients (lines 119-158):** Computes path integrals between a neutral baseline $x'$ (Gaussian noise $\mathcal{N}(0, 0.01)$) and the input $x$ across 10 interpolation steps:
   $$\text{IG}_i(x) = (x_i - x'_i) \times \int_{0}^1 \frac{\partial F(x' + \alpha(x - x'))}{\partial x_i} d\alpha$$
   Aggregates channel attributions into an absolute spatial importance map and applies `COLORMAP_HOT`.

#### D. Inputs and Outputs
- **Inputs:** PyTorch image tensor `(1, 3, 224, 224)`, resized PIL image, prediction dictionary.
- **Outputs:** Dictionary containing base64 PNG overlay strings for all 4 XAI methods, raw numpy arrays, and list of available methods.

#### E. Dependencies
- Relies on: `pytorch_grad_cam`, `captum.attr.IntegratedGradients`, `cv2`, `PIL`, `numpy`, `backend/config.py`.
- Depended on by: `backend/inference/predictor.py`.

#### F. Interview Relevance
- **Q:** *Why include Integrated Gradients alongside Grad-CAM?*  
  **A:** Grad-CAM produces coarse heatmaps because it taps into the final convolutional layer where spatial resolution has been downsampled to $7 \times 7$ pixels. Integrated Gradients computes gradients directly with respect to raw input pixels ($224 \times 224$), satisfying two foundational axioms of attribution: **Completeness** (attributions sum to the difference between output and baseline) and **Implementation Invariance** (functionally identical models yield identical attributions).
- **Q:** *Why use a Gaussian noise baseline instead of a pure black image for medical MRI Integrated Gradients?*  
  **A:** In brain MRI, black pixels ($0.0$) represent air outside the skull and cerebrospinal fluid. Using an all-black baseline artificially inflates the importance of edge boundaries. A low-variance Gaussian noise baseline ($\sigma = 0.01$) acts as a neutral information-free prior that avoids border contrast artifacts.

#### G. Weaknesses and Improvements
- **Weakness:** Score-CAM requires multiple forward passes per activation map, adding ~1.5s of latency on CPU.
- **Improvement:** Allow the client to pass an optional query parameter (`?methods=gradcam,ig`) so high-latency perturbation methods like Score-CAM are only computed when explicitly requested by the clinician.

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `backend/xai/xai_engine.py:1-212`; overlays verified in `test_e2e_full.py:85-87`.

---

### File: `backend/xai/xai_evaluator.py`

#### A. Purpose
Provides mathematical validation of explainability faithfulness. Implements the Pointing Game and Pixel Flipping curves to objectively verify whether XAI heatmaps genuinely reflect tumor pathology rather than spurious background correlations. `[VERIFIED: lines 1-86]`

#### B. Important Code
- **`evaluate(gradcam_map, gradcam_plus_map, seg_mask)`** (lines 12-53): Evaluates faithfulness metrics when a segmentation mask is available.
- **`_pointing_game(cam, mask)`** (lines 56-65): Computes whether the maximum attribution pixel $\arg\max(\text{CAM})$ falls within the tumor segmentation mask ($1.0 = \text{hit}, 0.0 = \text{miss}$).
- **`_pixel_flipping_curve(cam)`** (lines 66-85): Progressively masks out the top $k\%$ most salient pixels ($k \in [5, 10, 20, 30, 50\%]$) and tracks the proportion of attribution energy retained.

#### C. Logical-Block Explanation
1. **Pointing Game (lines 56-65):** Evaluates localization accuracy. Finds the coordinate $(i, j) = \arg\max(\text{CAM})$. If binary segmentation mask $M(i, j) == 1$, the model's most influential feature is confirmed inside the tumor tissue, returning 1.0.
2. **Pixel Flipping Attribution Energy (lines 66-85):** Tests attribution sensitivity. Sorts attribution values in descending order. For each masking threshold $k\%$, sets the top $k\%$ pixels to zero and calculates the fraction of total energy retained:
   $$\text{Retained}(k) = \frac{\sum_{(i,j) \notin \text{Top}_k} \text{CAM}(i,j)}{\sum \text{CAM}(i,j)}$$
   A steep drop indicates that the model's decision was concentrated in a tight, salient focus.

#### D. Inputs and Outputs
- **Inputs:** 2D numpy arrays of Grad-CAM / Grad-CAM++ activation maps, 2D binary segmentation mask array.
- **Outputs:** Dictionary containing Pointing Game binary scores and Pixel Flipping energy retention curves across $k \in [5, 10, 20, 30, 50\%]$.

#### E. Dependencies
- Relies on: `numpy`, `cv2`.
- Depended on by: `backend/inference/predictor.py`.

#### F. Interview Relevance
- **Q:** *Why is visual inspection alone insufficient to evaluate XAI heatmaps?*  
  **A:** Visual inspection is subjective and vulnerable to confirmation bias. Studies (Adebayo et al., 2018) have shown that some saliency methods behave like edge detectors, producing visually appealing heatmaps that are completely independent of model parameters. The Pointing Game and Pixel Flipping provide quantitative, reproducible metrics proving that the explanation is mathematically faithful to the model's internal activations.

#### G. Weaknesses and Improvements
- **Weakness:** The current pixel flipping implementation computes energy decay on the static heatmap rather than re-feeding the masked image into the classifier to observe the actual Softmax confidence drop.
- **Improvement:** Implement active pixel flipping: iteratively mask the top $k\%$ image pixels with blur/noise, pass the masked image back through the classifier, and plot the actual prediction probability decay curve.

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `backend/xai/xai_evaluator.py:1-86`; verified output in `routes_scans.py:82` and `test_result.json`.

---

### File: `backend/training/train_classifier.py`

#### A. Purpose
The model training script for NeuroVision. Loads the MRI dataset, creates a stratified 85% train / 15% validation split, trains all four ablation variants (`resnet50_only`, `swin_only`, `concat_no_attn`, `hybrid`) sequentially with Cosine Annealing learning rate schedules and Label Smoothing loss, and serializes the best checkpoint per variant based on validation macro AUC-ROC. `[VERIFIED: lines 1-344]`

#### B. Important Code
- **`seed_everything(seed=42)`** (lines 51-57): Enforces determinism across random, numpy, and torch RNG seeds.
- **`make_train_val_loaders()`** (lines 81-118): Executes stratified shuffle split preserving class distributions across training and validation sets.
- **Augmentation Pipeline** (lines 61-77): Random horizontal/vertical flips, $\pm 15^\circ$ rotation, color jitter, affine translations.
- **`train_one_epoch()` & `evaluate_loader()`** (lines 122-192): Standard training loop with gradient clipping (`clip_grad_norm_`) and validation macro AUC-ROC tracking.
- **`main()`** (lines 200-344): Sequential training loop iterating over all four ablation models, saving checkpoints to `saved_models/`, and generating `ablation_summary.json`.

#### C. Logical-Block Explanation
1. **Stratification & Transforms (lines 49-118):** Brain tumor classes can suffer from slight representation imbalance. `StratifiedShuffleSplit` guarantees that 85% of each class goes to training and 15% to validation. Heavy medical data augmentations (affine translation, flips, color jitter) prevent memorization.
2. **Training Execution (lines 120-195):** Uses AdamW optimizer with $\text{lr} = 10^{-4}$ and weight decay $10^{-4}$. Cosine Annealing scheduler smoothly decays learning rates across epochs. Tracks validation loss and multi-class One-vs-Rest AUC-ROC.
3. **Ablation Checkpointing (lines 200-344):** Sequentially trains each of the 4 models. Tracks best validation AUC-ROC. Only saves weights when validation AUC-ROC improves. Summarizes final validation performance in `saved_models/ablation_summary.json` and designates the best architecture.

#### D. Inputs and Outputs
- **Inputs:** Raw images organized in directory hierarchy `dataset/Training/{glioma, meningioma, notumor, pituitary}/`.
- **Outputs:** Serialized model weights (`hybrid_best.pth`, `concat_no_attn_best.pth`, etc.) and `ablation_summary.json`.

#### E. Dependencies
- Relies on: `torch`, `torchvision`, `sklearn.model_selection`, `sklearn.metrics.roc_auc_score`, `backend/models/hybrid_classifier.py`, `backend/config.py`.
- Depended on by: Standalone training pipeline execution.

#### F. Interview Relevance
- **Q:** *Why evaluate model checkpoints using Macro AUC-ROC instead of raw accuracy?*  
  **A:** Raw accuracy is skewed by class imbalances and sensitive to arbitrary classification thresholds (default 0.5). Macro AUC-ROC evaluates the model's discrimination ability across all possible discrimination thresholds, treating each tumor pathology with equal importance regardless of class prevalence.

#### G. Weaknesses and Improvements
- **Weakness:** Training runs sequentially on a single GPU/CPU rather than leveraging PyTorch Distributed Data Parallel (DDP).
- **Improvement:** Wrap model training in `torch.nn.parallel.DistributedDataParallel` for multi-GPU cluster scaling.

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `backend/training/train_classifier.py:1-344`; results verified in `saved_models/ablation_summary.json`.

---

### File: `backend/training/evaluate.py`

#### A. Purpose
Comprehensive research evaluation script. Computes test set metrics: per-class Accuracy, Precision, Recall, F1, AUC-ROC, Specificity, Normalized Confusion Matrices, ROC curves, Precision-Recall curves, Expected Calibration Error (ECE), 5-fold cross-validation, McNemar's statistical test, and DeLong's test for comparing ROC curves. Serializes all metrics to `saved_models/evaluation_results.json`. `[VERIFIED: lines 1-354]`

#### B. Important Code
- **`compute_metrics(probs, preds, labels)`** (lines 104-180): Calculates macro and weighted accuracy, precision, recall, F1, specificity, and multi-class One-vs-Rest AUC-ROC.
- **`compute_ece(probs, labels, n_bins=10)`** (lines 182-205): Computes Expected Calibration Error measuring alignment between predicted confidence and true empirical accuracy.
- **`mcnemar_test(preds_a, preds_b, labels)`** (lines 208-232): Chi-squared contingency test with Edwards' continuity correction evaluating whether accuracy differences between two models are statistically significant.
- **`main()`** (lines 235-354): Executes evaluation across the test set, evaluates all 4 variants, and writes `saved_models/evaluation_results.json`.

#### C. Logical-Block Explanation
1. **Multi-Class Metric Synthesis (lines 104-180):** Binarizes multi-class labels using One-vs-Rest encoding. Calculates true positive, false positive, true negative, and false negative counts per class. Computes specificity $\frac{TN}{TN + FP}$, essential for clinical screening tests.
2. **Expected Calibration Error (lines 182-205):** Partitions model predictions into 10 confidence bins. Within each bin $B_m$, computes the absolute difference between average confidence $\text{conf}(B_m)$ and actual accuracy $\text{acc}(B_m)$:
   $$\text{ECE} = \sum_{m=1}^{10} \frac{|B_m|}{N} |\text{acc}(B_m) - \text{conf}(B_m)|$$
   Low ECE ($<0.02$) proves the model's reported confidence reflects true clinical probability.
3. **Statistical Significance Testing (lines 208-232):** Constructs a $2 \times 2$ contingency table tracking discordant predictions ($n_{01}$: Model A wrong, Model B right; $n_{10}$: Model A right, Model B wrong). Calculates $\chi^2$ statistic:
   $$\chi^2 = \frac{(|n_{01} - n_{10}| - 1)^2}{n_{01} + n_{10}}$$
   Computes $p$-value from $\chi^2(1)$ distribution to reject the null hypothesis of equal performance.

#### D. Inputs and Outputs
- **Inputs:** Saved model weights in `saved_models/`, untouched test set in `dataset/Testing/`.
- **Outputs:** `saved_models/evaluation_results.json` containing complete evaluation curves and statistics.

#### E. Dependencies
- Relies on: `sklearn.metrics`, `scipy.stats.chi2`, `backend/models/hybrid_classifier.py`, `backend/config.py`.
- Depended on by: `backend/api/routes_stats.py`, `run_pipeline.py`.

#### F. Interview Relevance
- **Q:** *Why is McNemar's test necessary when comparing two deep learning models?*  
  **A:** Comparing raw test accuracy (e.g., 99.2% vs 98.8%) is insufficient because the difference could arise from random test sample variability. McNemar's test evaluates only the discordant test cases where one model succeeded and the other failed, determining whether the architectural improvement is statistically significant ($p < 0.05$).

#### G. Weaknesses and Improvements
- **Weakness:** Relies on pre-calculated calibration bins rather than fitting post-hoc calibration techniques like Temperature Scaling or Platt Scaling.
- **Improvement:** Implement Temperature Scaling on validation logits to optimize temperature parameter $T > 0$ via NLL loss before freezing test set predictions.

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `backend/training/evaluate.py:1-354`; referenced in `routes_stats.py:88-112`.

---

## 3. Backend API Routes & Controllers

---

### File: `backend/api/routes_scans.py`

#### A. Purpose
Primary clinical scan ingestion and management router. Validates uploaded medical scans against security policies (magic bytes, size limits, file extension whitelist), persists images to disk, triggers the full ML pipeline, and automatically creates corresponding `Patient`, `Scan`, `Analysis`, `Case`, `DiagnosticReport`, and `AuditLog` records. `[VERIFIED: lines 1-422]`

#### B. Important Code
- **`validate_image_security(contents, filename)`** (lines 31-65): Enforces 25 MB quota, extension whitelist (`.jpg`, `.png`, `.tif`), and magic-byte signature matching (`\xff\xd8\xff`, `\x89PNG`, `BM`, `RIFF`, `II*`, `MM*`).
- **`upload_and_analyze_scan(...)`** (lines 154-373): Main clinical ingestion endpoint. Runs predictor, commits all database entities, creates notifications, logs audit event, and returns formatted scan JSON.
- **`list_scans(...)`** (lines 375-382): Returns paginated list of scans ordered by `created_at DESC`.
- **`get_scan(scan_id)`** (lines 385-395): Returns complete scan record including heatmaps, radiomics, and patient demographics.
- **`toggle_archive_scan(scan_id)`** (lines 397-422): Toggles archival flag with full audit trail logging.

#### C. Logical-Block Explanation
1. **Perimeter Security Inspection (lines 31-65):** Before parsing with PIL, inspects raw binary bytes. Rejects files larger than 25 MB with HTTP 413. Rejects invalid extensions with HTTP 400. Inspects magic-byte headers to prevent executable polyglot file uploads (e.g., PHP scripts disguised as JPEGs).
2. **File Persistence & Patient Linking (lines 177-232):** Writes validated bytes to `uploads/` using a UUID-stamped filename. Resolves patient identity: if `patientId` exists, links to existing patient; otherwise, auto-creates a new patient with sequential collision-proof code (`PT-2026-XXXX`).
3. **Pipeline Trigger & Multi-Table Transaction (lines 247-330):** Invokes `predictor.predict()`. Commits `Scan`, `Analysis`, `Case`, and `DiagnosticReport` within a single coordinated transaction. If the tumor is high-risk, sets case priority to `urgent`.
4. **Clinical Notification Dispatch (lines 332-359):** Dispatches automated alerts to the `doctor` role indicating new analysis and report availability. If a doctor is assigned, delivers a targeted case notification.
5. **Audit Logging & Response (lines 361-373):** Records `UPLOAD_AND_ANALYZE_SCAN` in `audit_logs` with physician username, client IP, and diagnosis summary. Returns formatted scan dictionary.

#### D. Inputs and Outputs
- **Inputs:** `multipart/form-data` containing file binary (`scan`) and optional patient metadata form fields (`patientName`, `patientId`, `patientAge`, `patientGender`, `hospitalName`).
- **Outputs:** Comprehensive scan detail dictionary (HTTP 200) matching `Scan` TypeScript interface.

#### E. Dependencies
- Relies on: `fastapi`, `PIL`, `backend/database.py`, `backend/auth.py`, `backend/config.py`, `backend/inference/predictor.py`.
- Depended on by: `backend/main.py`, `frontend/src/pages/upload.tsx`, `frontend/src/pages/scan-analysis.tsx`.

#### F. Interview Relevance
- **Q:** *Why is magic byte verification mandatory for file upload endpoints instead of relying on the Content-Type header?*  
  **A:** The `Content-Type` header and file extension are client-controlled strings easily spoofed using tools like cURL or Burp Suite. An attacker can upload a malicious script named `exploit.php` with `Content-Type: image/jpeg`. Magic byte verification reads the actual initial binary bytes (`\xff\xd8\xff` for JPEG), ensuring the file is structurally a genuine image regardless of client headers.

#### G. Weaknesses and Improvements
- **Weakness:** The full ML pipeline runs synchronously inside the request handler. If GPU inference takes 500ms, the HTTP client connection remains open.
- **Improvement:** Decouple upload from inference: write the scan record with status `pending`, push the task to a Celery/Redis queue, return HTTP 202 Accepted immediately with scan ID, and update status to `completed` via WebSocket push notifications.

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `backend/api/routes_scans.py:1-422`; end-to-end ingestion verified in `test_e2e_full.py:54-92`.

---

### File: `backend/api/routes_cases.py`

#### A. Purpose
Clinical case management router. Enables physicians and hospital administrators to track patient cases, filter by status and triage priority, modify review statuses, update physician notes, assign attending radiologists, and maintain an audit log of case revisions. `[VERIFIED: lines 1-123]`

#### B. Important Code
- **`CaseUpdateRequest`** (lines 19-24): Pydantic schema for case mutations (`status`, `priority`, `notes`, `assigned_doctor_id`).
- **`list_cases(status, priority)`** (lines 60-74): Lists cases with optional status (`active`, `under_review`, `completed`) and priority (`low`, `medium`, `high`, `urgent`) filters.
- **`get_case(case_id)`** (lines 76-86): Fetches individual case by UUID or human-readable case number (`CASE-2026-0001`).
- **`update_case(...)`** (lines 88-123): Updates case fields, commits transaction, and records an `UPDATE_CASE` audit event.

#### C. Logical-Block Explanation
1. **Case Serialization (lines 26-58):** Joins `Case` with `Patient`, `Scan`, `Analysis`, and `User` (assigned doctor) to construct a consolidated clinical record.
2. **Case Retrieval & Filtering (lines 60-86):** Queries the database with optional dynamic SQL filters. Dual-lookup in `get_case` permits lookup via internal UUID or clinical case number.
3. **Case State Transitions (lines 88-123):** Enforces authentication via `get_current_user`. Updates fields specified in the request body. Commits changes and writes an audit log event with user identity and client IP.

#### D. Inputs and Outputs
- **Inputs:** Case update JSON payload, optional query parameters (`status`, `priority`).
- **Outputs:** Serialized case dictionaries matching the `Case` TypeScript interface.

#### E. Dependencies
- Relies on: `fastapi`, `pydantic`, `backend/database.py`, `backend/auth.py`.
- Depended on by: `backend/main.py`, `frontend/src/pages/cases.tsx`, `frontend/src/pages/doctor-dashboard.tsx`.

#### F. Interview Relevance
- **Q:** *How do you ensure data integrity when multiple doctors update case notes concurrently?*  
  **A:** Currently, the system uses Last-Write-Wins. In an enterprise system, implement optimistic concurrency control by adding a `version` integer column to the `cases` table. When updating, execute `UPDATE cases SET notes = :notes, version = version + 1 WHERE id = :id AND version = :expected_version`. If another physician updated the record in the interim, the query affects 0 rows, triggering an HTTP 409 Conflict.

#### G. Weaknesses and Improvements
- **Weakness:** Case status transitions are unrestricted (e.g., a case can transition directly from `completed` back to `active` without validation).
- **Improvement:** Implement a formal Finite State Machine (FSM) enforcing valid status transitions (`active` $\rightarrow$ `under_review` $\rightarrow$ `completed`).

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `backend/api/routes_cases.py:1-123`; verified in `test_e2e_full.py:108-122`.

---

### File: `backend/api/routes_reports.py`

#### A. Purpose
Diagnostic report controller. Manages generation, retrieval, versioning, and plain-text downloading of clinical radiology reports. Operates using purely local template synthesis without external LLMs. `[VERIFIED: lines 1-170]`

#### B. Important Code
- **`generate_report_for_scan(scan_id)`** (lines 74-142): Generates a new versioned diagnostic report from persisted analysis data, increments version number, commits to database, and logs `GENERATE_REPORT`.
- **`download_report(report_id)`** (lines 144-170): Returns raw report text as a downloadable attachment via `PlainTextResponse` with `Content-Disposition` header.

#### C. Logical-Block Explanation
1. **Report Retrieval (lines 39-72):** Lists reports or fetches a single report by ID. Includes a fallback mechanism: if the ID matches a `scan_id`, returns the latest version for that scan.
2. **Versioned Generation (lines 74-142):** Queries existing report counts for the scan and increments the version (`new_version = count + 1`). Extracts radiomics, uncertainty, and segmentation data from the `Analysis` record and invokes `generate_clinical_report()`. Inserts new `DiagnosticReport` and logs audit record.
3. **Attachment Download (lines 144-170):** Fetches report, logs `DOWNLOAD_REPORT` in the audit trail, and returns `PlainTextResponse` with filename header `Content-Disposition: attachment; filename="neuroscan_report_XXXX.txt"`.

#### D. Inputs and Outputs
- **Inputs:** `scan_id` or `report_id` string path parameters.
- **Outputs:** JSON report metadata or formatted plaintext file download.

#### E. Dependencies
- Relies on: `fastapi`, `backend/database.py`, `backend/auth.py`, `backend/report/report_generator.py`.
- Depended on by: `backend/main.py`, `frontend/src/pages/report-page.tsx`, `frontend/src/pages/reports.tsx`.

#### F. Interview Relevance
- **Q:** *Why is document versioning critical for diagnostic medical reports?*  
  **A:** In clinical practice, initial diagnostic impressions are frequently updated following biopsy results or surgical resection. Overwriting old reports destroys legal medical records. Incremental versioning (`v1`, `v2`, `v3`) preserves an immutable audit history of clinical interpretations over time.

#### G. Weaknesses and Improvements
- **Weakness:** Downloads are plain text files (`.txt`) rather than signed PDF documents.
- **Improvement:** Add an endpoint `/api/reports/{id}/pdf` compiling the report into a PDF with embedded visual thumbnails using Python `reportlab`.

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `backend/api/routes_reports.py:1-170`; verified in `test_e2e_full.py:94-106`.

---

### File: `backend/api/routes_users.py`

#### A. Purpose
Administrative staff directory controller. Provides endpoints for hospital administrators to view staff accounts, provision new clinical accounts, update credentials/titles, and toggle active status. `[VERIFIED: lines 1-184]`

#### B. Important Code
- **`list_users(...)`** (lines 51-58): Lists all user accounts. Strictly protected by `require_role(["admin"])`.
- **`create_user(...)`** (lines 60-103): Creates new staff account with duplicate username/email checks, role validation (`doctor`, `technician`, `admin`), PBKDF2 hashing, and audit logging.
- **`update_user(...)`** (lines 105-153): Modifies user fields with duplicate email collision prevention.
- **`toggle_user_active(...)`** (lines 155-184): Activates or deactivates user accounts. Explicitly blocks administrators from deactivating their own account.

#### C. Logical-Block Explanation
1. **Role Enforcement (lines 51-184):** Every route in this module injects `admin_user: User = Depends(require_role(["admin"]))`. Non-admin callers are immediately rejected with HTTP 403 Forbidden.
2. **Account Creation (lines 60-103):** Normalizes username and email to lowercase. Validates uniqueness against existing records. Generates avatar initials, hashes password, commits `User`, and records `CREATE_USER` in `audit_logs`.
3. **Account Deactivation (lines 155-184):** Toggles `is_active`. If `user_id == admin_user.id`, raises HTTP 400 Bad Request to prevent accidental administrative lockout.

#### D. Inputs and Outputs
- **Inputs:** `UserCreateRequest`, `UserUpdateRequest` JSON bodies, user ID path parameters.
- **Outputs:** Serialized user dictionaries (excluding password hashes).

#### E. Dependencies
- Relies on: `fastapi`, `backend/database.py`, `backend/auth.py`.
- Depended on by: `backend/main.py`, `frontend/src/pages/users.tsx`.

#### F. Interview Relevance
- **Q:** *Why is account deactivation preferred over row deletion in enterprise systems?*  
  **A:** Hard-deleting a user record violates foreign key integrity on historical scans, cases, and audit logs created by that employee. Soft deactivation (`is_active = False`) revokes login privileges immediately while preserving the historical audit trail.

#### G. Weaknesses and Improvements
- **Weakness:** User passwords updated via `update_user` do not validate password complexity requirements enforced during registration.
- **Improvement:** Apply `validate_password_strength()` to the `req.password` field in `update_user`.

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `backend/api/routes_users.py:1-184`; verified in `test_e2e_full.py:130-164`.

---

### File: `backend/api/routes_audit.py`

#### A. Purpose
Regulatory security and clinical audit trail controller. Provides hospital compliance officers and administrators with keyword-searchable, filtered access to the immutable audit log. `[VERIFIED: lines 1-69]`

#### B. Important Code
- **`get_audit_logs(...)`** (lines 34-69): Admin-only route supporting keyword search (`search`), action filtering (`action`), username filtering (`username`), role filtering (`role`), and pagination (`limit`, `offset`).

#### C. Logical-Block Explanation
1. **Dynamic SQL Query Construction (lines 45-64):** Constructs a SQLAlchemy query on `AuditLog`. Conditionally chains `.filter()` clauses based on query parameters. Implements case-insensitive partial keyword matching (`ilike`) across action, username, details, and resource type.
2. **Pagination & Ordering (lines 62-64):** Computes total count before pagination, orders records by `timestamp DESC`, and applies `offset` and `limit` to ensure fast query response times.

#### D. Inputs and Outputs
- **Inputs:** Query parameters (`search`, `action`, `username`, `role`, `limit`, `offset`).
- **Outputs:** JSON object with `total` integer and `logs` array.

#### E. Dependencies
- Relies on: `fastapi`, `backend/database.py`, `backend/auth.py`.
- Depended on by: `backend/main.py`, `frontend/src/pages/audit-logs.tsx`.

#### F. Interview Relevance
- **Q:** *Why is an audit trail fundamental for medical and clinical software?*  
  **A:** Regulatory frameworks like HIPAA Security Rule (§ 164.312(b)) and FDA 21 CFR Part 11 mandate hardware, software, and procedural mechanisms that record and examine activity in information systems containing Electronic Protected Health Information (ePHI). Every access, upload, diagnosis, and modification must be traced to a verified user, timestamp, and IP address.

#### G. Weaknesses and Improvements
- **Weakness:** The audit log table resides inside the primary application database. A database administrator could theoretically alter historical rows.
- **Improvement:** In enterprise environments, forward audit events to an external write-once-read-many (WORM) storage target, like AWS CloudWatch Logs or an immutable Elasticsearch cluster.

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `backend/api/routes_audit.py:1-69`; verified in `test_e2e_full.py:136-171`.

---

### File: `backend/api/routes_stats.py`

#### A. Purpose
Aggregates live database statistics for clinical dashboards (scans completed, active cases, class distributions, average confidence, risk breakdowns) and serves model research evaluation curves (ablation tables, ROC curves, calibration data). `[VERIFIED: lines 1-207]`

#### B. Important Code
- **`get_dashboard_stats(...)`** (lines 31-113): Executes SQL aggregations (`func.count`, `func.avg`) across `scans`, `patients`, `cases`, and `analyses`.
- **`get_system_stats(...)`** (lines 115-141): Computes administrative telemetry on user roles and active sessions.
- **`get_ablation()`** (lines 143-173): Parses `saved_models/ablation_summary.json` to return comparative performance metrics across all 4 architectures.
- **`get_roc()` & `get_calibration()`** (lines 175-207): Returns true positive rate / false positive rate coordinates and calibration bin data.

#### C. Logical-Block Explanation
1. **Live SQL Aggregation (lines 31-87):** Leverages database-level aggregation functions (`func.count(Scan.id)`, `func.avg(Analysis.confidence)`) rather than pulling entire record sets into Python memory. Iterates across `CLASS_NAMES` to calculate per-pathology scan counts and average confidence.
2. **Research Data Loading (lines 21-29, 143-207):** Reads pre-calculated evaluation results from `saved_models/ablation_summary.json` and `saved_models/evaluation_results.json`, serving structured coordinates for frontend Recharts graphs.

#### D. Inputs and Outputs
- **Inputs:** Database session dependency.
- **Outputs:** Consolidated JSON metrics dictionaries.

#### E. Dependencies
- Relies on: `fastapi`, `sqlalchemy.func`, `backend/database.py`, `backend/config.py`.
- Depended on by: `backend/main.py`, `frontend/src/pages/dashboard.tsx`, `frontend/src/pages/doctor-dashboard.tsx`, `frontend/src/pages/statistics.tsx`.

#### F. Interview Relevance
- **Q:** *Why execute aggregations in the database (`func.avg`) rather than using Python (`sum(x)/len(x)`)?*  
  **A:** Database engines are written in C/C++ and optimized for columnar aggregation, disk paging, and index scanning. Transferring 100,000 analysis rows over the network into Python memory to compute an average exhausts server RAM and introduces massive network I/O latency. A database query `SELECT AVG(confidence) FROM analyses` transfers a single 8-byte float.

#### G. Weaknesses and Improvements
- **Weakness:** Computes aggregations on every request without caching. On large databases (e.g., millions of scans), repeated dashboard page refreshes would strain database CPU.
- **Improvement:** Cache dashboard aggregate metrics in Redis with a 60-second time-to-live (TTL).

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `backend/api/routes_stats.py:1-207`; verified in `test_e2e_full.py:172-178`.

---

## 4. Frontend Architecture & Presentation Components

---

### File: `frontend/src/App.tsx`

#### A. Purpose
Root React component. Configures global providers (TanStack Query, Radix Tooltip, Theme Provider, Toast notifications), handles declarative client-side SPA routing via `wouter`, implements role-based dashboard dispatching, and renders the clinical header and sidebar navigation layout. `[VERIFIED: lines 1-254]`

#### B. Important Code
- **`DashboardDispatcher({ role })`** (lines 42-46): Renders `AdminDashboard`, `TechnicianDashboard`, or `DoctorDashboard` based on authenticated role.
- **`MainRouter({ role })`** (lines 48-91): Declarative client routes with role guards preventing technicians and doctors from accessing `/users` or `/audit-logs`.
- **`UserMenu()`** (lines 103-146): Avatar dropdown with user profile info, settings link, and logout mutation.
- **`App()`** (lines 148-254): Root provider wrapper assembling sidebar, top navigation, and route switcher.

#### C. Logical-Block Explanation
1. **Dynamic Dashboard Routing (lines 42-91):** Rather than forcing all staff to a generic home screen, `DashboardDispatcher` dynamically renders tailored workspaces based on the user's role.
2. **Role-Guarded Navigation (lines 70-82):** Routes like `/users` and `/audit-logs` inspect `role === "admin"`. If a non-admin attempts access, they are automatically redirected to `DoctorDashboard`.
3. **Session Verification (lines 160-220):** Invokes `useAuth()`. While the session query is resolving, displays a clinical pulse loader. If unauthenticated, displays the public landing page or login view. If authenticated, renders the full clinical application frame with collapsible sidebar.

#### D. Inputs and Outputs
- **Inputs:** Browser URL location, authentication state from `useAuth`.
- **Outputs:** Rendered React virtual DOM tree.

#### E. Dependencies
- Relies on: `react`, `wouter`, `@tanstack/react-query`, `lucide-react`, Radix UI components, all page components.
- Depended on by: `frontend/src/main.tsx`.

#### F. Interview Relevance
- **Q:** *Why use `wouter` instead of `react-router-dom`?*  
  **A:** `wouter` is a minimalist, hooks-based routing library with a bundle footprint of under 2 KB (compared to ~30 KB for React Router). It provides full routing capabilities, parameterized routes (`/scan/:id`), and nested switches without bloating client bundle size.

#### G. Weaknesses and Improvements
- **Weakness:** All pages are imported statically at the top of `App.tsx`, bundling all views into a single initial JavaScript bundle.
- **Improvement:** Implement dynamic code splitting using `React.lazy()` and `Suspense`: `const ScanAnalysis = React.lazy(() => import("@/pages/scan-analysis"))` to reduce initial load time.

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `frontend/src/App.tsx:1-254`.

---

### File: `frontend/src/hooks/useAuth.ts`

#### A. Purpose
Custom React hook managing institutional user authentication state, session verification, login mutations, and logout workflows via TanStack Query. Provides reactive boolean helpers (`isAuthenticated`, `isDoctor`, `isTechnician`, `isAdmin`). `[VERIFIED: lines 1-84]`

#### B. Important Code
- **`useQuery(["/api/auth/user"])`** (lines 7-30): Verifies session against backend using credentials (`include`). Caches session for 5 minutes (`staleTime: 300000`).
- **`loginMutation`** (lines 32-51): Submits credentials to `/api/auth/login`, updates query cache on success, and invalidates statistics queries.
- **`logoutMutation`** (lines 53-65): Posts to `/api/auth/logout`, clears user cache, and redirects browser to `/login`.

#### C. Logical-Block Explanation
1. **Session Hydration (lines 7-30):** On initial page mount, fetches `/api/auth/user`. If the server responds with 401 or 403, returns `null` without throwing unhandled exceptions. Disables automatic query retries (`retry: false`) to avoid spamming the backend with invalid token requests.
2. **Login Workflow (lines 32-51):** Submits username and password. On success, directly seeds the QueryClient cache (`setQueryData`) with the user profile, preventing extra network round-trips.
3. **Role Evaluation Helpers (lines 68-83):** Computes reactive boolean flags (`isDoctor: user?.role === "doctor"`, `isAdmin: user?.role === "admin"`), simplifying conditional UI rendering across components.

#### D. Inputs and Outputs
- **Inputs:** Login credential objects `{ username, password }`.
- **Outputs:** State object containing `user`, `isLoading`, `isAuthenticated`, `isDoctor`, `isAdmin`, `login()`, `logout()`.

#### E. Dependencies
- Relies on: `@tanstack/react-query`, `frontend/shared/schema.ts`.
- Depended on by: `App.tsx`, `login.tsx`, `app-sidebar.tsx`, navigation components.

#### F. Interview Relevance
- **Q:** *Why use TanStack Query for authentication state instead of React Context or Redux?*  
  **A:** Authentication state is fundamentally a server-state problem: it depends on remote session validity, token expiry, and permissions. TanStack Query automatically handles caching, stale-while-revalidate background checks, error states, and cross-tab session invalidation without writing hundreds of lines of boilerplate Redux actions and reducers.

#### G. Weaknesses and Improvements
- **Weakness:** Session stale time is hardcoded to 5 minutes. If an administrator deactivates a user's account, the user can continue navigating cached views for up to 5 minutes before the query refetches.
- **Improvement:** Intercept all API 401 responses globally in `queryClient.ts` to immediately trigger `queryClient.setQueryData(["/api/auth/user"], null)` upon the first unauthorized request.

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `frontend/src/hooks/useAuth.ts:1-84`.

---

### File: `frontend/src/pages/scan-analysis.tsx`

#### A. Purpose
Primary clinical diagnostic workstation component. Renders the interactive MRI viewer with overlay switching (Segmentation, Grad-CAM, Grad-CAM++, Integrated Gradients), displays quantitative radiomics bar charts, evaluates XAI faithfulness metrics, presents Bayesian uncertainty tiers, and triggers report generation. `[VERIFIED: lines 1-846]`

#### B. Important Code
- **`ScanAnalysis` component** (lines 41-846): Main workstation container.
- **State** (lines 47-49): `activeViewMode` controlling visual layer (`segmentation`, `gradcam`, `gradcam_plus`, `ig`, `raw`).
- **Data Queries** (lines 51-70): Fetches scan details (`/api/scans/:id`) and reports (`/api/scans/:id/reports`).
- **`generateReportMutation`** (lines 72-97): Submits POST to `/api/scans/:id/reports/generate`, invalidating report caches on success.

#### C. Logical-Block Explanation
1. **Header & Clinical Badge Banner (lines 100-240):** Displays patient demographics (name, code, age, gender), scan date, and primary pathology classification badge with confidence and risk pill badges.
2. **Interactive MRI Workstation (lines 245-380):** Embeds `MRIViewer` component with tabbed selector for toggling between raw MRI, Attention U-Net segmentation mask, and three XAI heatmaps.
3. **Clinical Metrics Panel (lines 385-550):** Displays Bayesian uncertainty metrics (standard deviation $\sigma$, Shannon entropy, clinical interpretation flag) and tumor volume percentages.
4. **Radiomics Biomarker Explorer (lines 555-700):** Renders horizontal progress bars for top 10 radiomics features with SHAP importance values, directional impact arrows, and medical clinical descriptions.
5. **XAI Faithfulness Panel (lines 705-770):** Renders Pointing Game hit/miss indicator and Pixel Flipping energy retention decay curves.
6. **Report Management (lines 775-846):** Lists existing diagnostic reports and provides one-click generation button.

#### D. Inputs and Outputs
- **Inputs:** URL route parameter `scanId`.
- **Outputs:** Rendered clinical workstation interface.

#### E. Dependencies
- Relies on: `useQuery`, `useMutation`, `MRIViewer`, Radix UI components, Lucide icons, `frontend/shared/schema.ts`.
- Depended on by: `frontend/src/App.tsx`.

#### F. Interview Relevance
- **Q:** *How does the UI prevent cognitive overload for radiologists reviewing multi-dimensional AI outputs?*  
  **A:** Information architecture: high-level triage summaries (pathology, confidence, risk tier) are displayed prominently in the top banner. Deep quantitative metrics (radiomics, pixel flipping, entropy) are partitioned into tabbed secondary cards, allowing radiologists to review high-level conclusions instantly while keeping raw mathematical evidence accessible on demand.

#### G. Weaknesses and Improvements
- **Weakness:** File size is 846 lines; combines viewer layout, radiomics rendering, and report lists in a single file.
- **Improvement:** Refactor into sub-components (`RadiomicsPanel.tsx`, `FaithfulnessCard.tsx`, `ReportHistoryCard.tsx`).

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `frontend/src/pages/scan-analysis.tsx:1-846`.

---

### File: `frontend/src/components/brain-visualization.tsx`

#### A. Purpose
Renders an interactive, real-time 3D human brain anatomical model using Three.js and React Three Fiber. Features smooth 360-degree rotation, vertex shaders, sweeping MRI laser plane animations, and simulated neoplastic tumor nodule pulses. `[VERIFIED: lines 1-410]`

#### B. Important Code
- **`useGLTF.preload("/models/brain.glb")`** (line 7): Pre-caches the 3.3 MB 3D brain mesh.
- **`AnatomicalBrainModel()`** (lines 10-180): Extracts anatomical geometry, sets up materials with custom shader uniforms, and controls frame-by-frame animations in `useFrame()`.
- **`BrainVisualization()`** (lines 350-410): Top-level component wrapping `Canvas`, camera controls, lighting rigs, and loading fallback skeletons.

#### C. Logical-Block Explanation
1. **Asset Loading & Geometry Extraction (lines 10-31):** Uses `@react-three/drei`'s `useGLTF` hook to load `/models/brain.glb`. Traverses the model hierarchy, extracts vertex normals, and centers the bounding box geometry at coordinates $(0, 0, 0)$.
2. **Animation Loop (`useFrame`) (lines 33-70):** Rotates the brain group smoothly along the Y-axis ($t \times 0.22$). Oscillates a translucent laser scan ring along the vertical axis ($\sin(t \times 1.4) \times 0.72$) to simulate real-time axial CT/MRI beam slicing. Pulses the neoplastic tumor nodule scale ($1 + 0.28 \sin(t \times 3.2)$).
3. **Lighting & Environment (lines 350-410):** Positions ambient lights, directional spot lights with cyan/blue clinical tones, and orbital camera controls with restricted zoom boundaries.

#### D. Inputs and Outputs
- **Inputs:** Optional props for tumor coordinates, scanning mode, or interactive highlights.
- **Outputs:** Interactive WebGL 3D canvas.

#### E. Dependencies
- Relies on: `three`, `@react-three/fiber`, `@react-three/drei`, WebGL.
- Depended on by: `frontend/src/pages/landing.tsx`, dashboard headers.

#### F. Interview Relevance
- **Q:** *Why incorporate 3D WebGL anatomical models in a clinical enterprise application?*  
  **A:** Beyond visual presentation, 3D anatomical visualization provides spatial orientation. In multi-slice MRI reading, 3D surface rendering helps neurosurgeons visualize tumor depth, relation to eloquent cortex, and cranial bone margins for pre-surgical trajectory planning.

#### G. Weaknesses and Improvements
- **Weakness:** Loading a 3.3 MB GLB mesh over slow institutional cellular networks can delay initial landing page rendering.
- **Improvement:** Apply Draco compression to `brain.glb`, reducing mesh file size by ~70% to <1 MB with zero perceptual loss in geometry.

#### H. Evidence and Confidence
- `[VERIFIED]`: Inspected in `frontend/src/components/brain-visualization.tsx:1-410`; binary asset verified at `frontend/dist/models/brain.glb` (3,317,952 bytes).
