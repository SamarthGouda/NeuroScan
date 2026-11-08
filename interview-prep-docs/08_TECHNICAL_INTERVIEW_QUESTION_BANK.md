# NeuroVision (NeuroScan AI) — Technical Interview Question Bank

> **Target Interview Role:** Graduate Technology Role at **Thermo Fisher Scientific**  
> **Structure:** 65 In-Depth Technical, Architectural, SQL, Algorithmic, Scenario-Based, and Behavioral Questions with Model Answers, Repository Evidence, Common Traps, and Follow-Ups.

---

## Section A: Project Introduction & High-Level Architecture

### Q1: Can you walk me through the architecture of NeuroVision?
- **Interview-Ready Answer:**  
  "NeuroVision is an enterprise-grade clinical decision support platform for neuro-oncology MRI analysis. Architecturally, it is decoupled into three tiers: a React 18 single-page application with Three.js for 3D anatomical visualization, a high-performance Python FastAPI asynchronous gateway enforcing security headers and RBAC, and a machine learning inference engine. The backend ingests an MRI, validates its binary magic bytes, and passes it through an attention-gated CNN-ViT dual-branch classifier. We quantify Bayesian uncertainty using 50 Monte Carlo Dropout passes, segment tumor boundaries with an Attention U-Net, extract 13 radiomic biomarkers with SHAP feature ranking, and generate quad-method XAI heatmaps. Everything is persisted via SQLAlchemy into a normalized 9-table schema backed by an append-only audit trail."
- **Deep Technical Explanation:**  
  The system uses a layered clean architecture. The gateway handles perimeter defense (`backend/main.py:92-102`) and rate limiting (`backend/auth.py:36-51`). The service layer coordinates long-running analytics (`backend/inference/predictor.py:139-296`). The data layer abstracts database engines via SQLAlchemy 2.0 ORM (`backend/database.py`), enabling zero-downtime portability between SQLite in development and PostgreSQL in production Docker containers.
- **Repository Evidence:** `backend/main.py`, `backend/database.py`, `backend/inference/predictor.py`.
- **Common Trap:** Describing it merely as "a machine learning model" rather than a full-stack clinical platform with authentication, databases, and auditing.
- **Likely Follow-Up:** *Why decouple the architecture rather than rendering server-side templates with Jinja2?*  
  **Follow-Up Answer:** Decoupling via REST APIs allows the same backend to serve web clients, mobile apps, and hospital PACS integrations without duplicating ML pipeline logic.

---

### Q2: Why did you choose a hybrid CNN-ViT model instead of a standard ResNet or Vision Transformer alone?
- **Interview-Ready Answer:**  
  "In medical imaging, CNNs and Vision Transformers have complementary strengths. CNNs have strong inductive bias—locality and translation equivariance—making them exceptional at picking up fine-grained local textures like necrotic tissue or microcalcifications. Vision Transformers lack strong spatial inductive bias but excel at modeling long-range global contexts across brain hemispheres through self-attention. Our hybrid fuses ResNet-50 with Swin Transformer Tiny via a learnable attention gate that dynamically weights local versus global representations per patient."
- **Deep Technical Explanation:**  
  In `backend/models/hybrid_classifier.py:28-70`, `AttentionFusion` concatenates the 2048-dim ResNet feature vector with the 768-dim Swin feature vector into a 2816-dim representation. An MLP (`Linear(2816, 256) -> ReLU -> Linear(256, 1) -> Sigmoid`) outputs scalar $\alpha \in [0, 1]$. Our ablation study (`saved_models/ablation_summary.json`) proved that dual-branch architectures achieve higher validation AUC (>0.9998) than CNN-only (0.9991) or ViT-only (0.9998) baselines.
- **Repository Evidence:** `backend/models/hybrid_classifier.py:74-117`, `saved_models/ablation_summary.json`.
- **Common Trap:** Claiming the hybrid model is faster. Transformers add computational overhead; the justification is diagnostic accuracy and area under the ROC curve.
- **Likely Follow-Up:** *What does the ablation study show as the best performing model?*  
  **Follow-Up Answer:** Direct concatenation without gating (`concat_no_attn`) achieved a slightly higher validation AUC of 0.99994, which the predictor dynamically selects at runtime.

---

### Q3: What happens from the moment a user clicks "Upload" to when the report appears on screen?
- **Interview-Ready Answer:**  
  "It travels through an eight-stage pipeline: First, the React client dispatches a multipart request. Second, FastAPI inspects the binary buffer for magic bytes and enforces a 25 MB quota. Third, the file is saved to disk with a UUID filename, and the patient record is linked or created. Fourth, `NeuroVisionPredictor` runs 50 MC Dropout passes for classification and uncertainty. Fifth, Attention U-Net computes tumor area. Sixth, XAI generates Grad-CAM and Integrated Gradients heatmaps while radiomics computes 13 biomarkers. Seventh, an atomic database transaction commits the Analysis, Case, Diagnostic Report, and Audit Log records. Eighth, the server returns a 200 OK JSON payload and the frontend transitions to the analysis workstation."
- **Repository Evidence:** `backend/api/routes_scans.py:154-373`, `backend/inference/predictor.py:139-296`.
- **Common Trap:** Forgetting to mention database persistence and audit logging.
- **Likely Follow-Up:** *Is this pipeline synchronous or asynchronous?*  
  **Follow-Up Answer:** Currently synchronous on FastAPI's threadpool. An enterprise enhancement would offload stages 4–6 to a Celery/Redis worker queue.

---

## Section B: Database Design, SQL & Data Quality (Thermo Fisher Focus)

### Q4: Walk me through your database schema. How is it normalized?
- **Interview-Ready Answer:**  
  "The schema is built on SQLAlchemy 2.0 and comprises 9 relational tables: `users`, `patients`, `scans`, `analyses`, `cases`, `diagnostic_reports`, `notifications`, `audit_logs`, and `email_otps`. It adheres to Third Normal Form (3NF). Every table has a UUID primary key, foreign keys enforce referential integrity with cascading deletes where appropriate, and indexes are placed on frequent lookup columns. There is one intentional denormalization: `analyses.patient_id` is stored directly on `analyses` to allow fast patient history lookups without joining through `scans`."
- **Deep Technical Explanation:**  
  In `backend/database.py:51-244`, `Patient` has a one-to-many relationship with `Scan` and `Case` (`cascade="all, delete-orphan"`). `Scan` has a one-to-one relationship with `Analysis` (`uselist=False`). The denormalized `analyses.patient_id` trades a tiny amount of storage for a 50% reduction in join depth on patient dashboard queries.
- **Repository Evidence:** `backend/database.py:51-244`.
- **Common Trap:** Claiming the schema is 100% normalized without acknowledging the deliberate denormalization of `analyses.patient_id`.
- **Likely Follow-Up:** *Why use UUID strings instead of integer auto-increments for Primary Keys?*  
  **Follow-Up Answer:** Integer auto-increments leak patient volume to competitors/attackers and cause primary key collisions when merging databases from multiple hospital branches. UUID4 is globally unique and decentralized.

---

### Q5: How do you prevent SQL injection in NeuroVision?
- **Interview-Ready Answer:**  
  "SQL injection is neutralized at the architectural level because we use SQLAlchemy 2.0 ORM parameterized queries exclusively. User inputs are never concatenated or formatted into raw SQL strings; they are passed as bound parameters through the ORM, ensuring the database engine treats them strictly as data, never as executable SQL commands."
- **Deep Technical Explanation:**  
  Across all route files (`routes_scans.py`, `routes_cases.py`, `routes_users.py`), queries use constructs like `db.query(Case).filter(Case.id == case_id)`. SQLAlchemy compiles these into parameterized statements (e.g., `WHERE cases.id = ?`). The only raw SQL in the entire repository is `db.execute(text("SELECT 1"))` in `health_check()`, which contains no user variables.
- **Repository Evidence:** `backend/database.py`, `backend/api/routes_cases.py:82-84`.
- **Common Trap:** Saying "FastAPI sanitizes SQL". FastAPI validates JSON schema via Pydantic; the database abstraction layer (SQLAlchemy) prevents SQL injection.
- **Likely Follow-Up:** *Can ORMs still be vulnerable to SQL injection?*  
  **Follow-Up Answer:** Yes, if a developer uses raw SQL fragments with f-strings (e.g., `session.execute(text(f"SELECT * FROM users WHERE name = '{user_input}'"))`). We avoided this pattern completely.

---

### Q6: How would you write a query to find the second-highest risk score per tumor type?
- **Interview-Ready Answer:**  
  "I would use a Common Table Expression (CTE) with the `DENSE_RANK()` window function, partitioning by `predicted_class` and ordering by `risk_score DESC`, then filtering where rank equals 2."
- **Deep Technical Explanation:**
```sql
WITH RankedAnalyses AS (
    SELECT 
        predicted_class,
        scan_id,
        risk_score,
        DENSE_RANK() OVER (PARTITION BY predicted_class ORDER BY risk_score DESC) as rk
    FROM analyses
)
SELECT predicted_class, scan_id, risk_score
FROM RankedAnalyses
WHERE rk = 2;
```
  `DENSE_RANK()` ensures that if two scans tie for the highest score, the next score is ranked 2 (unlike `RANK()`, which would skip to 3).
- **Common Trap:** Using `LIMIT 1 OFFSET 1`. That only works globally for a single class, not across partitioned groups.
- **Likely Follow-Up:** *What is the difference between `ROW_NUMBER()`, `RANK()`, and `DENSE_RANK()`?*  
  **Follow-Up Answer:** For duplicate values [10, 10, 8]: `ROW_NUMBER()` assigns [1, 2, 3]; `RANK()` assigns [1, 1, 3]; `DENSE_RANK()` assigns [1, 1, 2].

---

### Q7: How would you detect orphaned scans or data quality inconsistencies?
- **Interview-Ready Answer:**  
  "I would use a `LEFT JOIN` from child to parent filtering where the parent primary key `IS NULL`. For example, finding scans without patients: `SELECT s.id FROM scans s LEFT JOIN patients p ON s.patient_id = p.id WHERE p.id IS NULL`. Similarly, to detect automation gaps where completed scans lack cases: `SELECT s.id FROM scans s WHERE s.status = 'completed' AND NOT EXISTS (SELECT 1 FROM cases c WHERE c.scan_id = s.id)`."
- **Deep Technical Explanation:**  
  In clinical data engineering, referential gaps indicate failed distributed transactions. Using `NOT EXISTS` allows the query engine to execute a semi-join with early termination, outperforming `NOT IN` when nulls are present.
- **Repository Evidence:** `interview-prep-docs/04_DATABASE_AND_SQL.md:Section 4`.
- **Likely Follow-Up:** *How does your application prevent orphaned records in code?*  
  **Follow-Up Answer:** In `backend/database.py`, foreign keys specify `cascade="all, delete-orphan"`. When a `Patient` is deleted, SQLAlchemy cascades deletion to all associated `scans` and `cases`.

---

### Q8: How does NeuroVision handle database connection pooling and failover?
- **Interview-Ready Answer:**  
  "In `backend/database.py`, the engine configuration checks the dialect. For SQLite in development, it sets `check_same_thread=False` to accommodate FastAPI's multi-threaded event loop. For PostgreSQL in production, it configures a connection pool with `pool_size=10`, `max_overflow=20`, and `pool_pre_ping=True`. `pool_pre_ping` validates connection liveness before handing it to a worker, preventing dropped-connection errors."
- **Repository Evidence:** `backend/database.py:29-43`.
- **Common Trap:** Using default SQLite connection settings in FastAPI, which causes `ProgrammingError: SQLite objects created in a thread can only be used in that same thread`.
- **Likely Follow-Up:** *What does `max_overflow=20` do?*  
  **Follow-Up Answer:** If all 10 pooled connections are busy during a spike in traffic, SQLAlchemy can open up to 20 additional temporary connections before rejecting requests.

---

## Section C: Machine Learning, Bayesian Uncertainty & XAI

### Q9: How does Monte Carlo Dropout work, and why not just use the standard Softmax output?
- **Interview-Ready Answer:**  
  "Standard Softmax outputs a normalized probability vector, not a true confidence measure. Deep neural networks are notoriously overconfident—they will output 99% probability even on completely corrupted or out-of-distribution images. Monte Carlo Dropout keeps dropout layers active during inference, passing the identical image through the network 50 times. Each pass randomly drops 30% of neurons, sampling from the model's posterior distribution. We compute the mean probability vector and the standard deviation ($\sigma$). A high $\sigma$ indicates the model is uncertain, triggering a clinical warning."
- **Deep Technical Explanation:**  
  In `backend/inference/uncertainty.py:18-23`, `enable_dropout()` forces `nn.Dropout.train()` while keeping `BatchNorm.eval()`. In lines 56-66, it computes mean, standard deviation, and predictive Shannon entropy: $H(P) = -\sum p_i \ln(p_i + 10^{-8})$. If $\sigma < 0.05$, it assigns `LOW` tier; if $\sigma > 0.15$, it assigns `HIGH` tier.
- **Repository Evidence:** `backend/inference/uncertainty.py:25-92`.
- **Common Trap:** Confusing MC Dropout with training dropout. In training, dropout prevents co-adaptation. In MC Dropout, it is used at inference time for Bayesian uncertainty quantification.
- **Likely Follow-Up:** *What is the difference between Aleatoric and Epistemic uncertainty?*  
  **Follow-Up Answer:** Aleatoric uncertainty arises from inherent sensor noise in the image (e.g., patient movement during MRI). Epistemic uncertainty arises from the model's lack of knowledge (e.g., a tumor type rarely seen in training). MC Dropout primarily measures epistemic uncertainty.

---

### Q10: How does Attention U-Net differ from a standard U-Net?
- **Interview-Ready Answer:**  
  "In a standard U-Net, skip connections copy feature maps directly from the encoder to the decoder, often transferring irrelevant background noise like cranial bone or air. Attention U-Net introduces Additive Attention Gates at each skip connection. The gating signal from the deeper decoder layer highlights salient tumor regions and suppresses background activations before concatenating with encoder features."
- **Deep Technical Explanation:**  
  In `backend/models/attention_unet.py:35-58`, `AttentionGate` takes gating signal $g$ and skip features $x$. It computes $\psi = \sigma(W_\psi \cdot \text{ReLU}(W_g \cdot g + W_x \cdot x))$ and returns $\psi \odot x$. The model uses a ResNet-34 encoder and is trained with a combined `DiceBCELoss` (`DiceBCELoss = BCE + (1 - \text{Dice})`) to overcome foreground-background pixel imbalance.
- **Repository Evidence:** `backend/models/attention_unet.py:35-151`.
- **Common Trap:** Claiming Attention U-Net uses self-attention like a Transformer. It uses additive gating convolutions, not multi-head dot-product self-attention.
- **Likely Follow-Up:** *Why use a combined Dice + BCE loss?*  
  **Follow-Up Answer:** BCE optimizes pixel-level classification but struggles when tumor pixels occupy <5% of the image. Dice loss optimizes global region overlap directly. Combining both provides smooth gradient descent while penalizing poor overlap.

---

### Q11: Explain the four XAI methods in your project and how you evaluate their faithfulness.
- **Interview-Ready Answer:**  
  "We implement four methods: Grad-CAM uses first-order gradients to weight convolutional feature maps. Grad-CAM++ uses second-order derivatives to better capture multiple tumor foci. Score-CAM is gradient-free, using activation maps as masks to measure forward-pass score increases. Integrated Gradients uses path integrals from a Gaussian baseline via Captum. To prove these heatmaps are mathematically faithful rather than pretty pictures, we evaluate them with the Pointing Game (does the peak activation fall inside the segmentation mask?) and Pixel Flipping (measuring attribution energy decay as salient pixels are masked)."
- **Deep Technical Explanation:**  
  `backend/xai/xai_engine.py:86-158` generates overlays. In `backend/xai/xai_evaluator.py:56-85`, `_pointing_game()` checks if $\arg\max(\text{CAM})$ is within the binary tumor mask. `_pixel_flipping_curve()` masks the top 5%, 10%, 20%, 30%, and 50% most salient pixels and tracks retained attribution energy.
- **Repository Evidence:** `backend/xai/xai_engine.py`, `backend/xai/xai_evaluator.py`.
- **Common Trap:** Claiming Grad-CAM gives pixel-perfect resolution. Grad-CAM taps the final conv layer ($7 \times 7$ pixels) and is coarse. Integrated Gradients operates at input pixel resolution ($224 \times 224$).
- **Likely Follow-Up:** *Why use a Gaussian noise baseline for Integrated Gradients instead of an all-black image?*  
  **Follow-Up Answer:** Black pixels represent background air in MRI scans. A zero baseline creates false edge contrast. Low-variance Gaussian noise ($\sigma=0.01$) acts as a neutral information-free prior.

---

### Q12: How are radiomics features extracted and ranked without `pyradiomics`?
- **Interview-Ready Answer:**  
  "To guarantee compatibility with modern Python versions without fragile C++ dependencies, we built a pure NumPy, SciPy, and Scikit-Image extractor. It computes 13 features across first-order intensity statistics (Mean, Variance, Skewness, Kurtosis, Entropy), GLCM texture matrices (Contrast, Correlation, Energy, Homogeneity across 4 angles), and morphological shape (Area, Perimeter, Elongation, Solidity). Features are ranked using SHAP values generated by an XGBoost tree explainer."
- **Repository Evidence:** `backend/radiomics/radiomics_extractor.py:1-316`.
- **Common Trap:** Claiming radiomics is a deep learning feature. Radiomics features are handcrafted, deterministic mathematical equations conforming to IBSI standards.
- **Likely Follow-Up:** *What clinical insight does GLCM Contrast provide?*  
  **Follow-Up Answer:** GLCM Contrast measures local intensity variations between neighboring pixels. High contrast reflects tissue heterogeneity, a hallmark of aggressive high-grade glioblastomas.

---

## Section D: APIs, Web Architecture & Security

### Q13: How is user authentication implemented in NeuroVision?
- **Interview-Ready Answer:**  
  "Authentication uses salted PBKDF2-HMAC-SHA256 password hashing with 100,000 iterations and a 16-byte random salt. Upon successful login, the server issues a signed, tamper-proof session token signed with HMAC-SHA256 using `AUTH_SECRET`. The token contains standard claims (`sub`, `username`, `role`, `iat`, `exp`). It is delivered both as a response field and in an `HttpOnly`, `SameSite=Lax` cookie. Endpoints use FastAPI dependency injection (`get_current_user` and `require_role`) to validate tokens and enforce role-based access."
- **Deep Technical Explanation:**  
  In `backend/auth.py:71-91`, `hash_password()` formats the hash as `base64(salt):base64(key)`. `verify_password()` extracts the salt and key and uses `hmac.compare_digest` to prevent timing attacks. `create_token()` (`lines 116-128`) serializes claims to base64url and appends the hex signature.
- **Repository Evidence:** `backend/auth.py:53-146`.
- **Common Trap:** Saying you use plain MD5, SHA-256, or vanilla JWT. We use PBKDF2 with 100,000 iterations for passwords, and a custom HMAC-SHA256 signed bearer token format.
- **Likely Follow-Up:** *Why use `HttpOnly` cookies?*  
  **Follow-Up Answer:** `HttpOnly` cookies cannot be accessed by JavaScript (`document.cookie`), completely protecting the session token from being stolen via Cross-Site Scripting (XSS) attacks.

---

### Q14: How do you prevent malicious file uploads on `/api/scans/upload`?
- **Interview-Ready Answer:**  
  "We employ defense-in-depth: First, the buffer length is checked against a 25 MB quota. Second, the file extension is validated against a strict whitelist (`.jpg`, `.png`, `.tif`). Third, and most importantly, we verify binary magic bytes—inspecting the initial bytes to ensure they match genuine JPEG (`\xff\xd8\xff`) or PNG (`\x89PNG`) signatures. Finally, we completely discard the user-supplied filename and save the file to disk using a cryptographically random UUID, eliminating directory traversal attacks."
- **Repository Evidence:** `backend/api/routes_scans.py:31-65`.
- **Common Trap:** Relying on the `Content-Type` header sent by the client. An attacker can easily send `Content-Type: image/jpeg` with a malicious PHP or executable file.
- **Likely Follow-Up:** *What is a polyglot file, and how does magic byte verification prevent it?*  
  **Follow-Up Answer:** A polyglot file is valid in two formats simultaneously (e.g., a valid GIF image that also contains executable JavaScript). Inspecting magic bytes and then immediately decoding via PIL ensures the image parser successfully deserializes the pixel matrix without executing injected script code.

---

### Q15: How does your rate limiter work, and what are its limitations?
- **Interview-Ready Answer:**  
  "In `backend/auth.py:36-51`, `check_rate_limit` implements a sliding-window rate limiter in Python. It maps client IP keys to lists of floating-point timestamps. On each request, it purges timestamps older than the window (300 seconds). If the remaining count exceeds the threshold (5 requests), it returns `False`, raising an HTTP 429 Too Many Requests. The limitation is that it is stored in process memory. In a multi-worker cluster, worker processes do not share memory, so an attacker could round-robin between workers. The enterprise fix is to back the sliding window with Redis."
- **Repository Evidence:** `backend/auth.py:33-51`.
- **Likely Follow-Up:** *How would you implement this in Redis?*  
  **Follow-Up Answer:** Use a Redis Sorted Set (`ZSET`). For each request: `ZREMRANGEBYSCORE key 0 (now - window)`, `ZCARD key` to check count, and `ZADD key now now` with an `EXPIRE` matching the window.

---

## Section E: Python, Code Quality & Enterprise Systems

### Q16: How do you handle exceptions in the ML pipeline so that a prediction failure doesn't crash the server?
- **Interview-Ready Answer:**  
  "In `backend/api/routes_scans.py:249-255`, the prediction execution is wrapped in a dedicated `try...except` block. If the PyTorch model throws an Out-of-Memory (OOM) or tensor error, the exception is caught, the scan record status is updated to `'failed'` in the database, the transaction is committed, and an HTTP 500 error is returned to the client with the failure detail. The server process continues running smoothly."
- **Repository Evidence:** `backend/api/routes_scans.py:249-255`.
- **Likely Follow-Up:** *Why commit the status as `'failed'` rather than rolling back?*  
  **Follow-Up Answer:** If you roll back, the scan record vanishes. By committing `'failed'`, hospital administrators can see that an acquisition occurred and inspect logs to determine why the analysis failed.

---

### Q17: What design patterns are visible in your Python codebase?
- **Interview-Ready Answer:**  
  "Several key patterns:
  1. **Singleton Pattern:** Used for `NeuroVisionPredictor` in `backend/main.py:62`, loaded once into `app.state.predictor` during lifespan startup rather than re-instantiating models on every request.
  2. **Dependency Injection:** FastAPI's `Depends(get_db)` and `Depends(get_current_user)` inject database sessions and user authentication into route controllers.
  3. **Factory Pattern:** `require_role(allowed_roles)` is a closure factory returning tailored role-checking dependencies.
  4. **Adapter / Wrapper Pattern:** `RadiomicsExtractor` wraps Scikit-Image, SciPy, and XGBoost into a clean `.extract(image, mask)` interface."
- **Repository Evidence:** `backend/main.py`, `backend/auth.py:206-216`, `backend/radiomics/radiomics_extractor.py:213-221`.

---

## Section F: Alignment with Thermo Fisher Scientific (ITAM, CMDB, Data Quality)

### Q18: Thermo Fisher manages thousands of enterprise IT assets, lab instruments, and software configurations. How does your experience on NeuroVision translate to IT Asset Management (HAM/SAM) and CMDB data quality?
- **Interview-Ready Answer:**  
  "While NeuroVision manages medical imaging assets and patient clinical cases rather than server racks or laboratory centrifuges, the underlying data architecture is identical:
  1. **Relational Asset Cataloging:** In NeuroVision, an MRI scan is an asset with metadata (filename, storage path, acquisition date, status). This mirrors Hardware Asset Management (HAM), where an asset has serial numbers, physical locations, firmware versions, and operational statuses.
  2. **Auditability & Traceability:** Our `audit_logs` table records every lifecycle event (`CREATE_USER`, `UPLOAD_SCAN`, `UPDATE_CASE`) with timestamps and user IDs. In ITAM, this is the foundation of change management and compliance auditing.
  3. **Data Quality & Reconciliation:** We enforce data validation at the perimeter (magic bytes, schema validation) and query for orphaned records (`scans` without `patients`). In a CMDB, data reconciliation ensures discovery tools don't create duplicate Configuration Items (CIs) and that orphaned software licenses are flagged.
  4. **Python & SQL Automation:** I wrote Python scripts to automate health monitoring, data transformations, and model evaluations—the exact skills required to automate ServiceNow CMDB discovery integrations and ETL pipelines."
- **Common Trap:** Exaggerating that you built ServiceNow in college. Acknowledge that this was a medical imaging platform, but demonstrate that the data engineering principles (reconciliation, data models, automation, auditing) are directly transferable.

---

### Q19: If you were tasked with building an automated data-quality monitor for NeuroVision's database, what checks would you implement?
- **Interview-Ready Answer:**  
  "I would create a daily automated Python job executing five validation queries:
  1. **Completeness Check:** Detect missing or null values in required fields (e.g., completed scans with null analysis records).
  2. **Referential Integrity Check:** Detect orphaned child records using `LEFT JOIN ... WHERE parent.id IS NULL`.
  3. **Uniqueness Check:** Detect duplicate patient records using `GROUP BY full_name, age HAVING COUNT(*) > 1`.
  4. **Value Range & Validity Check:** Detect probabilities outside $[0.0, 1.0]$ or tumor volume percentages $>100\%$.
  5. **Drift & Distribution Check:** Compute rolling 7-day averages of model confidence and risk tiers. If average confidence drops by >15%, alert the engineering team to potential image sensor degradation or distribution drift."
- **Repository Evidence:** `interview-prep-docs/04_DATABASE_AND_SQL.md:Section 4`.

---

## Section G: Challenging & Critical "Grill-Me" Questions

### Q20: What did YOU actually implement, and what came from libraries or templates?
- **Interview-Ready Answer:**  
  "I leveraged standard open-source libraries for foundational building blocks—PyTorch for tensor math, `timm` for the Swin Transformer backbone, `pytorch-grad-cam` and Captum for raw gradient hooks, FastAPI for routing, and Radix UI for base frontend primitives. My primary engineering contribution was the end-to-end architecture and integration:
  1. Designing and implementing the attention gating fusion MLP in `hybrid_classifier.py`.
  2. Building the 50-pass Monte Carlo Dropout and Shannon entropy engine in `uncertainty.py`.
  3. Writing the pure NumPy/SciPy radiomics extractor to eliminate the legacy C++ `pyradiomics` dependency.
  4. Designing the 9-table normalized database schema with foreign keys and audit logging in `database.py`.
  5. Implementing perimeter security: magic-byte validation, sliding-window rate limiting, and PBKDF2 authentication in `auth.py` and `routes_scans.py`.
  6. Writing the comprehensive automated E2E test suite in `test_e2e_full.py` that verifies the entire system."
- **Common Trap:** Claiming you wrote ResNet or Swin Transformer from scratch. Be proud of leveraging industry-standard tools while clearly articulating your architectural and integration code.

---

### Q21: What is the biggest limitation of your project, and what would you change in a production environment?
- **Interview-Ready Answer:**  
  "The biggest limitation is that the deep learning pipeline runs synchronously on single 2D axial MRI slices rather than processing full 3D volumetric sequences (T1, T2, FLAIR). In a production hospital environment, I would make three major changes:
  1. **Asynchronous Task Queue:** Decouple scan upload from inference using Celery and Redis, allowing uploads to return an immediate 202 Accepted while GPU workers process jobs in the background.
  2. **Distributed Rate Limiting & Caching:** Move the in-memory rate limiter and dashboard stats to Redis.
  3. **3D Volumetric Ingestion:** Upgrade the architecture to ingest full 3D DICOM series using a 3D U-Net (like nnU-Net) with native PACS C-STORE network integration."

---

### Q22: What happens if two physicians edit the same case notes at the exact same second?
- **Interview-Ready Answer:**  
  "In the current implementation, the database uses Last-Write-Wins: whichever `PUT /api/cases/{id}` request commits last will overwrite the `notes` column. To fix this in production, I would implement Optimistic Concurrency Control:
  1. Add a `version` integer column to the `cases` table.
  2. When the client loads the case, it receives `version: 3`.
  3. When updating, the SQL executes: `UPDATE cases SET notes = :notes, version = version + 1 WHERE id = :id AND version = :version`.
  4. If another doctor updated the case in the interim, `version` is already 4, the update affects 0 rows, and the API returns HTTP 409 Conflict with a prompt to merge notes."

---

## Section H: Scenario-Based Engineering Questions

### Q23: The hospital reports that the server is returning HTTP 503 errors on scan uploads. How do you troubleshoot this step-by-step?
- **Interview-Ready Answer:**  
  "Step 1: Check the health probe at `/api/health`. Look at `"ml_inference": {"status": ...}`.
  Step 2: Inspect `backend/api/routes_scans.py:173`. An HTTP 503 specifically indicates `predictor is None`.
  Step 3: Check Uvicorn server startup logs for `[App] WARNING: Could not initialize predictor`.
  Step 4: Check filesystem permissions and presence of checkpoints in `saved_models/`. Did someone delete `concat_no_attn_best.pth` or `ablation_summary.json`?
  Step 5: Check GPU/CPU memory. Did PyTorch fail to allocate memory during weight loading?
  Step 6: Verify PyTorch/CUDA driver compatibility if running inside a Docker container."

---

### Q24: You notice in the audit log that someone is making 100 requests per minute from a hospital workstation IP, triggering 429 errors. What do you do?
- **Interview-Ready Answer:**  
  "Step 1: Query `audit_logs` for that IP address to inspect the actions being attempted (e.g., repeated `LOGIN_FAILED` indicates a brute-force attack; repeated `UPLOAD_SCAN` could be an automated script or technician re-trying on a slow connection).
  Step 2: If malicious, add an immediate IP block rule at the perimeter firewall or Nginx reverse proxy level.
  Step 3: If legitimate (e.g., an automated batch upload script from the MRI scanner), work with the hospital network team to register an authorized API service account with a dedicated API key and higher rate-limit tier."

---

## Section I: Behavioral & HR Questions (Structured STAR Templates)

### Q25: Tell me about a time you had to deal with an unexpected technical failure and how you solved it.
- **STAR Response Template (Grounding in Radiomics C++ failure):**
  - **Situation:** "While developing the radiomics feature extraction pipeline, I initially integrated the standard `pyradiomics` library."
  - **Task:** "When deploying the application to modern Python environments (Python 3.12/3.13) and containerizing on Linux, the build repeatedly failed because `pyradiomics` relies on unmaintained C++ extensions that wouldn't compile."
  - **Action:** "Rather than downgrading the entire project to an older Python version, I reverse-engineered the mathematical definitions of the required IBSI radiomic features. I wrote a pure Python replacement (`backend/radiomics/radiomics_extractor.py`) using NumPy, SciPy, and Scikit-Image for GLCM texture matrices and morphological shape properties, integrated with SHAP and XGBoost."
  - **Result:** "The new extractor eliminated 100% of C++ compiler dependencies, reduced the Docker image build time by 4 minutes, and achieved 100% cross-platform compatibility."

---

### Q26: Tell me about a mistake you made in this project and what you learned.
- **STAR Response Template (Grounding in SPA Routing Catch-All):**
  - **Situation:** "During frontend-backend integration, I configured FastAPI to serve the React SPA `index.html` using a catch-all route `/{full_path:path}`."
  - **Task:** "I noticed automated tests and API clients were receiving HTTP 200 OK with HTML content instead of HTTP 404 with JSON when an API route had a typo (like `/api/scan/invalid`)."
  - **Action:** "I investigated the ASGI route matching hierarchy and realized the SPA catch-all was swallowing unmatched `/api/*` paths. I wrote an explicit guard function (`serve_spa_or_api_guard` in `backend/main.py:170-209`) that checks `full_path.startswith('api/')` and immediately raises an `HTTPException(status_code=404)`. I then added automated test assertions in `test_e2e_full.py` to verify that API 404s always return clean JSON."
  - **Result:** "This taught me the importance of strict perimeter routing and defense-in-depth API contract enforcement."
