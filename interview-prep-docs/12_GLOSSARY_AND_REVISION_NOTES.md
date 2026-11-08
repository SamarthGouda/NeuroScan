# 12. Technical Glossary & Quick Revision Notes

> **Purpose:** A comprehensive, alphabetized reference guide defining every technical concept, algorithm, library, and enterprise term actually utilized or referenced within the **NeuroScan** repository. Use this for rapid pre-interview revision.

---

## A

### ACID (Atomicity, Consistency, Isolation, Durability)
A set of four properties that guarantee database transactions are processed reliably:
- **Atomicity:** All operations in a transaction succeed, or all are rolled back (`db.rollback()`).
- **Consistency:** Database transitions only between valid states conforming to constraints and foreign keys.
- **Isolation:** Concurrent transactions execute without interfering with one another.
- **Durability:** Committed transactions persist permanently, even through system crashes.
*NeuroScan Context:* Enforced by SQLite in `backend/database.py` through transactional context managers and WAL journaling.

### Aleatoric Uncertainty
Uncertainty inherent in the data itself due to noise, measurement errors, or low resolution. Unlike epistemic uncertainty, aleatoric uncertainty cannot be reduced by collecting more training data.
*NeuroScan Context:* Distinguished from epistemic uncertainty; NeuroScan isolates epistemic model doubt via Monte Carlo Dropout.

### Alembic
A lightweight database migration tool written for Python that operates alongside SQLAlchemy. It allows developers to define, track, and roll back schema changes (`upgrade()` and `downgrade()`) across deployment environments.
*NeuroScan Context:* Identified as a key enterprise enhancement to replace automatic `create_all()` schema initialization.

### ASGI (Asynchronous Server Gateway Interface)
The modern Python standard for asynchronous web servers, enabling concurrent handling of long-lived connections, WebSockets, and asynchronous HTTP requests.
*NeuroScan Context:* Uvicorn acts as the ASGI server executing the FastAPI application in `backend/main.py`.

### Attention Gate / Cross-Attention
A deep learning mechanism that computes dynamic weighting coefficients between different feature representations, allowing one feature set (e.g., global transformer tokens) to guide which elements of another feature set (e.g., local convolutional edges) to prioritize.
*NeuroScan Context:* Evaluated in `backend/models/fusion.py` as an alternative to simple linear concatenation.

### Audit Trail
An immutable, chronologically ordered record of system activities, state transitions, and user actions providing documentary evidence of the sequence of activities that have affected a specific operation, procedure, or event.
*NeuroScan Context:* Implemented in the `audit_logs` table (`backend/database.py`), recording every login, upload, analysis, and report generation for regulatory compliance.

---

## C

### CMDB (Configuration Management Database)
An enterprise database that stores information about the hardware, software, systems, and personnel that make up an organization's IT infrastructure, as well as the relationships between them. Each entry is known as a Configuration Item (CI).
*NeuroScan Context:* Highly relevant to Thermo Fisher's enterprise infrastructure; NeuroScan proposes mapping MRI scanners and analysis nodes to CMDB CIs.

### Contrast (GLCM)
A second-order Haralick texture metric that measures the local variations and intensity differences between neighboring pixels:
$$\sum_{i,j} |i - j|^2 \cdot P(i,j)$$
High contrast indicates sharp local texture variations (e.g., heterogeneous tumor margins).
*NeuroScan Context:* Computed in `backend/radiomics/radiomics_extractor.py` and ranked by the XGBoost feature importance model.

### Cross-Entropy Loss
A standard classification loss function measuring the performance of a model whose output is a probability value between 0 and 1:
$$L = -\sum_{c=1}^C y_c \log(\hat{y}_c)$$
*NeuroScan Context:* Used to train the ResNet and Swin classification backbones in `backend/training/trainer.py`.

---

## D

### Dice Similarity Coefficient (DSC) / Dice Loss
A spatial overlap metric commonly used to evaluate medical image segmentation algorithms:
$$DSC = \frac{2 |X \cap Y|}{|X| + |Y|}$$
Dice Loss is defined as $1 - DSC$, penalizing discrepancies between predicted segmentation masks and ground-truth clinical annotations.
*NeuroScan Context:* Used in `backend/training/losses.py` for segmenting tumor margins.

### DICOM (Digital Imaging and Communications in Medicine)
The international standard format and communication protocol for storing, transmitting, and viewing medical imaging information (MRI, CT, ultrasound) and associated patient metadata.
*NeuroScan Context:* Currently, NeuroScan accepts standard converted formats (JPEG/PNG); full DICOM C-STORE integration is a proposed enterprise enhancement.

---

## E

### ECE (Expected Calibration Error)
A scalar metric that measures how well a model's predicted confidence probabilities match its true empirical accuracy across discrete confidence bins. A perfectly calibrated model has an ECE of zero.
*NeuroScan Context:* Evaluated in `saved_models/ablation_summary.json` to verify that high-confidence predictions reflect high clinical accuracy.

### Elongation (Morphology)
A geometric shape descriptor measuring how stretched or eccentric a region is, defined as the ratio of the minor axis length to the major axis length:
$$\text{Elongation} = 1 - \frac{\text{minor\_axis}}{\text{major\_axis}}$$
*NeuroScan Context:* Extracted in `backend/radiomics/radiomics_extractor.py` to differentiate round, well-circumscribed tumors (meningiomas) from irregularly shaped infiltrative lesions (gliomas).

### Energy / Uniformity (GLCM)
A Haralick texture metric representing the sum of squared elements in the GLCM:
$$\sum_{i,j} P(i,j)^2$$
High energy indicates a very homogeneous, uniform image with few gray-level transitions.
*NeuroScan Context:* Extracted in `backend/radiomics/radiomics_extractor.py`.

### Epistemic Uncertainty
Uncertainty caused by a lack of knowledge or limited training data in specific regions of the input space. It can be reduced by providing more training samples.
*NeuroScan Context:* Quantified in `backend/inference/predictor.py` using 50 stochastic Monte Carlo Dropout forward passes.

---

## F

### FastAPI
A modern, high-performance Python web framework for building RESTful APIs based on standard Python type hints, automatic OpenAPI/Swagger documentation, and asynchronous I/O via Starlette and Pydantic.
*NeuroScan Context:* The core backend API framework powering all 11 route files.

### Focal Loss
An extension of cross-entropy loss designed to address extreme class imbalance by adding a modulating factor $(1 - p_t)^\gamma$ to down-weight easy, well-classified examples and focus training on hard, ambiguous cases:
$$FL(p_t) = -\alpha_t (1 - p_t)^\gamma \log(p_t)$$
*NeuroScan Context:* Implemented in `backend/training/losses.py` to handle class imbalances across rare brain tumor subtypes.

---

## G

### GLCM (Gray-Level Co-occurrence Matrix)
A statistical method of examining texture that considers the spatial relationship of pixels. It calculates how often pairs of pixels with specific values and in a specified spatial relationship occur in an image.
*NeuroScan Context:* Generated in `backend/radiomics/radiomics_extractor.py` across multiple angles ($0^\circ, 45^\circ, 90^\circ, 135^\circ$) to compute Haralick metrics.

### Grad-CAM (Gradient-Weighted Class Activation Mapping)
An explainable AI technique that uses the gradients of any target concept flowing into the final convolutional layer to produce a coarse localization map highlighting the important regions in the image for predicting that concept.
*NeuroScan Context:* Implemented in `backend/xai/gradcam.py` to visualize the spatial regions influencing the ResNet-50 predictions.

---

## H

### HAM (Hardware Asset Management)
The systematic management of physical IT assets—such as servers, workstations, scanners, and laboratory instrumentation—throughout their entire lifecycle from procurement to disposal.
*NeuroScan Context:* Directly aligns with Thermo Fisher's operations; mapped in `09_THERMO_FISHER_ROLE_MAPPING.md`.

### Haralick Features
A set of 14 textural features originally proposed by Robert M. Haralick in 1973, derived from the Gray-Level Co-occurrence Matrix (GLCM), describing image homogeneity, contrast, correlation, and energy.
*NeuroScan Context:* Form the mathematical foundation of the radiomics feature extractor in `radiomics_extractor.py`.

### HiRes-CAM
An improved class activation mapping technique that bypasses the global average pooling step used in Grad-CAM, computing element-wise multiplication between gradients and activations to produce sharper, pixel-faithful saliency boundaries.
*NeuroScan Context:* Implemented in `backend/xai/hirescam.py` and benchmarked against Grad-CAM.

### HMAC (Hash-Based Message Authentication Code)
A specific type of message authentication code involving a cryptographic hash function in combination with a secret cryptographic key, used to simultaneously verify data integrity and authenticity.
*NeuroScan Context:* Used in `backend/auth.py` to sign and verify bearer tokens for API authentication.

---

## I

### Image Biomarker Standardisation Initiative (IBSI)
An independent international collaboration that standardizes the extraction and mathematical definitions of radiomics features to ensure reproducibility across different software tools and medical clinics.
*NeuroScan Context:* Identified as an enterprise standard to align handcrafted radiomics features with in future iterations.

### Integrated Gradients
An axiomatic attribution method for deep neural networks that calculates the integral of the gradients along the straight-line path from a neutral reference baseline image (e.g., all black) to the input image, satisfying completeness and implementation invariance.
*NeuroScan Context:* Implemented in `backend/xai/integrated_gradients.py`.

---

## K

### Kurtosis
A statistical measure of the "tailedness" of the probability distribution of a real-valued random variable. In medical imaging, high kurtosis indicates that intensity variations are driven by infrequent, extreme pixel values (e.g., calcifications or sharp necrosis).
*NeuroScan Context:* Extracted as a first-order radiomics feature in `radiomics_extractor.py`.

---

## M

### Magic Bytes (File Signatures)
The specific initial byte sequences placed at the beginning of a file format to identify the file format type to the operating system or application independently of the file extension.
- **JPEG:** `\xff\xd8\xff`
- **PNG:** `\x89\x50\x4e\x47\x0d\x0a\x1a\x0a` (`\x89PNG`)
*NeuroScan Context:* Inspected in `backend/api/routes_scans.py` to prevent arbitrary file upload vulnerabilities.

### Monte Carlo Dropout (MC Dropout)
A technique where dropout is left enabled during inference, and multiple forward passes are executed on the same input. The resulting distribution of predictions approximates Bayesian inference, allowing measurement of model uncertainty without retraining.
*NeuroScan Context:* Implemented in `backend/inference/predictor.py` with 50 stochastic passes.

---

## P

### PBKDF2 (Password-Based Key Derivation Function 2)
A key derivation function that applies a pseudorandom function (such as HMAC-SHA256) along with a cryptographic salt to the input password many thousands of times to slow down brute-force and dictionary attacks.
*NeuroScan Context:* Implemented in `backend/auth.py` with 100,000 iterations and a 16-byte random salt.

### Pixel Flipping AUC
An XAI faithfulness evaluation technique. Pixels identified as highly important by a saliency map are sequentially perturbed or masked (flipped to baseline). A faithful explanation will cause the model's confidence in the correct class to drop rapidly, producing a low Area Under the Curve (AUC).
*NeuroScan Context:* Implemented in `backend/xai/metrics.py`.

### Pointing Game
An empirical evaluation framework for explainable AI. The coordinate of maximum saliency on an attribution heatmap is extracted; if this point falls inside the ground-truth clinical lesion boundary, it is scored as a 'Hit'; otherwise, it is a 'Miss'. The overall hit rate measures explanation accuracy.
*NeuroScan Context:* Benchmark metric computed in `backend/xai/metrics.py`.

### Pydantic
A data validation and settings management library for Python that uses Python type annotations to enforce data schemas, parse JSON payloads, and generate clean error messages upon validation failure.
*NeuroScan Context:* Defines all API request and response data models across the backend.

---

## R

### Radiomics
The high-throughput extraction of large amounts of quantitative features from medical images using mathematical algorithms, converting digital medical images into mineable data tables for clinical decision support.
*NeuroScan Context:* Implemented in `backend/radiomics/radiomics_extractor.py` (extracting 18 features per scan).

### ResNet-50 (Residual Network)
A 50-layer deep convolutional neural network that uses skip connections (residual blocks) to bypass layers, allowing gradients to flow directly during backpropagation and solving the vanishing gradient problem in very deep networks.
*NeuroScan Context:* Acts as the convolutional feature extractor branch in `backend/models/fusion.py`.

---

## S

### SAM (Software Asset Management)
The business practice of managing and optimizing the purchase, deployment, maintenance, utilization, and disposal of software applications within an enterprise.
*NeuroScan Context:* Mapped to Thermo Fisher graduate requirements in `09_THERMO_FISHER_ROLE_MAPPING.md`.

### Shannon Entropy
A mathematical measure of information uncertainty:
$$H(X) = -\sum_{i=1}^n P(x_i) \log_2 P(x_i)$$
In classification, entropy reaches zero when the model is 100% confident in one class, and reaches its maximum when probabilities are uniformly distributed across all classes (complete uncertainty).
*NeuroScan Context:* Computed over the Monte Carlo Dropout probability distributions in `predictor.py`.

### Skewness
A measure of the asymmetry of the probability distribution of a real-valued random variable about its mean. Positive skewness indicates an intensity distribution with an asymmetric tail extending toward brighter gray levels.
*NeuroScan Context:* Extracted as a first-order intensity feature in `radiomics_extractor.py`.

### Solidity (Morphology)
The ratio of the area of a region to the area of its convex hull:
$$\text{Solidity} = \frac{\text{Area}}{\text{Convex Area}}$$
Smooth, solid structures have high solidity (~1.0); irregular, indented structures (such as invasive malignant tumors) have low solidity.
*NeuroScan Context:* Extracted in `radiomics_extractor.py`.

### Swin Transformer (Shifted Windows)
A hierarchical vision transformer that computes self-attention within local, non-overlapping windows and allows cross-window connections by shifting the window partitions between consecutive layers, achieving linear computational complexity relative to image size.
*NeuroScan Context:* Operates as the global context branch in `backend/models/fusion.py`.

---

## W

### WAL (Write-Ahead Logging)
A database management method where changes are first recorded in a sequential log file before being applied to the main database pages. This allows multiple readers to read concurrently while a writer appends to the log, significantly improving concurrency.
*NeuroScan Context:* Enabled in SQLite via `PRAGMA journal_mode=WAL` in `backend/database.py`.

---

## X

### XGBoost (Extreme Gradient Boosting)
An optimized distributed gradient boosting library designed to be highly efficient, flexible, and portable, constructing an ensemble of decision trees sequentially to minimize a regularized objective function.
*NeuroScan Context:* Used in `backend/radiomics/feature_ranking.py` to evaluate and rank the predictive importance of the 18 handcrafted radiomics biomarkers.
