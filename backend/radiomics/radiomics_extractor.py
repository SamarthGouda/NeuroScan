"""
radiomics_extractor.py
Pure numpy/scipy/scikit-image implementation of radiomics feature extraction.
Replaces pyradiomics for Python 3.13 compatibility.
"""

import numpy as np
from scipy import stats
from scipy.stats import entropy as scipy_entropy
from skimage.feature import graycomatrix, graycoprops
from skimage.measure import label, regionprops
import xgboost as xgb
import shap
import warnings
warnings.filterwarnings("ignore")


CLASS_NAMES = ["glioma", "meningioma", "notumor", "pituitary"]

FEATURE_MEDICAL_MEANING = {
    "FirstOrder_Mean": "Average pixel intensity in tumor region",
    "FirstOrder_Variance": "Intensity spread — higher in heterogeneous tumors",
    "FirstOrder_Skewness": "Asymmetry of intensity distribution",
    "FirstOrder_Kurtosis": "Peakedness of intensity — high in calcified regions",
    "FirstOrder_Entropy": "Texture randomness — high in malignant tumors",
    "GLCM_Contrast": "Local intensity variation — high in aggressive tumors",
    "GLCM_Correlation": "Linear dependency of gray levels",
    "GLCM_Energy": "Textural uniformity — low in heterogeneous tumors",
    "GLCM_Homogeneity": "Closeness of distribution to GLCM diagonal",
    "Shape_Area": "Tumor region pixel count — proxy for size",
    "Shape_Perimeter": "Boundary length — irregular in malignant tumors",
    "Shape_Elongation": "Aspect ratio — elongated tumors may indicate infiltration",
    "Shape_Solidity": "Convexity — lower in irregular tumor boundaries",
}


def _extract_first_order(region_pixels: np.ndarray) -> dict:
    """Extract first-order statistical features from pixel intensities."""
    pixels = region_pixels.flatten().astype(np.float64)
    if len(pixels) == 0:
        return {k: 0.0 for k in [
            "FirstOrder_Mean", "FirstOrder_Variance",
            "FirstOrder_Skewness", "FirstOrder_Kurtosis", "FirstOrder_Entropy"
        ]}

    # Normalize to [0, 1]
    pmin, pmax = pixels.min(), pixels.max()
    if pmax > pmin:
        pixels_norm = (pixels - pmin) / (pmax - pmin)
    else:
        pixels_norm = pixels * 0.0

    # Entropy via histogram
    hist, _ = np.histogram(pixels_norm, bins=256, range=(0, 1), density=True)
    hist = hist + 1e-10
    ent = scipy_entropy(hist)

    return {
        "FirstOrder_Mean": float(np.mean(pixels_norm)),
        "FirstOrder_Variance": float(np.var(pixels_norm)),
        "FirstOrder_Skewness": float(stats.skew(pixels_norm)),
        "FirstOrder_Kurtosis": float(stats.kurtosis(pixels_norm)),
        "FirstOrder_Entropy": float(ent),
    }


def _extract_glcm(region_gray: np.ndarray) -> dict:
    """Extract GLCM texture features."""
    # Convert to uint8 for GLCM
    img = region_gray.astype(np.float64)
    pmin, pmax = img.min(), img.max()
    if pmax > pmin:
        img = ((img - pmin) / (pmax - pmin) * 255).astype(np.uint8)
    else:
        img = np.zeros_like(img, dtype=np.uint8)

    # Reduce gray levels for faster computation
    img = (img // 16).astype(np.uint8)  # 16 gray levels

    try:
        glcm = graycomatrix(
            img,
            distances=[1, 2],
            angles=[0, np.pi/4, np.pi/2, 3*np.pi/4],
            levels=16,
            symmetric=True,
            normed=True
        )
        contrast = float(graycoprops(glcm, "contrast").mean())
        correlation = float(graycoprops(glcm, "correlation").mean())
        energy = float(graycoprops(glcm, "energy").mean())
        homogeneity = float(graycoprops(glcm, "homogeneity").mean())
    except Exception:
        contrast = correlation = energy = homogeneity = 0.0

    return {
        "GLCM_Contrast": contrast,
        "GLCM_Correlation": correlation,
        "GLCM_Energy": energy,
        "GLCM_Homogeneity": homogeneity,
    }


def _extract_shape(mask: np.ndarray) -> dict:
    """Extract shape features from binary mask."""
    binary = (mask > 0.5).astype(np.uint8)
    labeled = label(binary)
    regions = regionprops(labeled)

    if not regions:
        return {
            "Shape_Area": 0.0,
            "Shape_Perimeter": 0.0,
            "Shape_Elongation": 1.0,
            "Shape_Solidity": 1.0,
        }

    # Use largest region
    region = max(regions, key=lambda r: r.area)

    area = float(region.area)
    perimeter = float(region.perimeter) if region.perimeter > 0 else 1.0

    # Elongation = minor_axis / major_axis (1.0 = circle, <1 = elongated)
    major = region.major_axis_length if region.major_axis_length > 0 else 1.0
    minor = region.minor_axis_length if region.minor_axis_length > 0 else 1.0
    elongation = float(minor / major)

    solidity = float(region.solidity) if region.solidity else 1.0

    return {
        "Shape_Area": area,
        "Shape_Perimeter": perimeter,
        "Shape_Elongation": elongation,
        "Shape_Solidity": solidity,
    }


def _build_feature_vector(image_np: np.ndarray, mask_np: np.ndarray) -> tuple[dict, list]:
    """Build complete feature dict and ordered feature list."""
    # Convert image to grayscale if RGB
    if image_np.ndim == 3:
        gray = np.mean(image_np, axis=2)
    else:
        gray = image_np.copy()

    # Extract masked region
    binary_mask = (mask_np > 0.5)
    if binary_mask.sum() < 10:
        # Fallback: use full image
        binary_mask = np.ones_like(gray, dtype=bool)

    region_pixels = gray[binary_mask]

    fo = _extract_first_order(region_pixels)
    glcm = _extract_glcm(gray * binary_mask)
    shape = _extract_shape(mask_np)

    all_features = {**fo, **glcm, **shape}
    feature_names = list(all_features.keys())
    feature_values = [all_features[k] for k in feature_names]

    return all_features, feature_names, feature_values


class RadiomicsExtractor:
    """
    Pure numpy/scipy/skimage radiomics extractor.
    Compatible with Python 3.13. No pyradiomics dependency.
    """

    def __init__(self):
        self._xgb_model = None
        self._feature_names = None
        self._shap_explainer = None
        self._fitted = False

    def fit(self, images: list, masks: list, labels: list):
        """
        Fit XGBoost on radiomics features for SHAP importance.
        Call this once after training with a sample of training images.
        """
        X, y = [], []
        for img, mask, lbl in zip(images, masks, labels):
            try:
                _, names, values = _build_feature_vector(img, mask)
                X.append(values)
                y.append(lbl)
                if self._feature_names is None:
                    self._feature_names = names
            except Exception:
                continue

        if len(X) < 10:
            self._fitted = False
            return

        X = np.array(X)
        y = np.array(y)

        self._xgb_model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            use_label_encoder=False,
            eval_metric="mlogloss",
            verbosity=0,
        )
        self._xgb_model.fit(X, y)
        self._shap_explainer = shap.TreeExplainer(self._xgb_model)
        self._fitted = True

    def extract(self, image, mask_np: np.ndarray) -> dict:
        """
        Predictor pipeline compatibility wrapper.
        Accepts PIL Image or numpy array and returns {'features': [...]}.
        """
        image_np = np.asarray(image)
        features = self.extract_features(image_np, mask_np)
        return {"features": features}

    def extract_features(self, image_np: np.ndarray, mask_np: np.ndarray) -> list[dict]:
        """
        Extract radiomics features and return top 10 with SHAP importance.

        Args:
            image_np: HxW or HxWx3 numpy array (float, 0-1 or 0-255)
            mask_np:  HxW numpy array (float 0-1, binary mask)

        Returns:
            List of dicts: [{"name": str, "value": float, "shap": float, "direction": str}]
        """
        try:
            all_features, feature_names, feature_values = _build_feature_vector(
                image_np, mask_np
            )
        except Exception as e:
            return self._fallback_features()

        # Normalize values to [0, 1] for display
        values_arr = np.array(feature_values)
        vmax = np.abs(values_arr).max()
        if vmax > 0:
            values_norm = values_arr / vmax
        else:
            values_norm = values_arr

        # Get SHAP values if model is fitted
        if self._fitted and self._shap_explainer is not None:
            try:
                x = np.array(feature_values).reshape(1, -1)
                shap_values = self._shap_explainer.shap_values(x)
                # shap_values shape: (n_classes, 1, n_features) or (1, n_features)
                if isinstance(shap_values, list):
                    # Multi-class: average absolute SHAP across classes
                    shap_arr = np.mean(
                        [np.abs(sv[0]) for sv in shap_values], axis=0
                    )
                else:
                    shap_arr = np.abs(shap_values[0])
            except Exception:
                shap_arr = np.abs(values_norm)
        else:
            # Fallback: use normalized feature value as proxy importance
            shap_arr = np.abs(values_norm)

        # Build result list
        results = []
        for i, name in enumerate(feature_names):
            raw_val = feature_values[i]
            shap_val = float(shap_arr[i]) if i < len(shap_arr) else 0.0
            direction = "up" if raw_val >= 0 else "down"
            results.append({
                "name": name,
                "raw_name": name,
                "value": float(values_norm[i]),
                "norm_value": float(values_norm[i]),
                "raw_value": float(raw_val),
                "shap": round(shap_val, 4),
                "direction": direction,
                "medical_meaning": FEATURE_MEDICAL_MEANING.get(name, ""),
                "description": FEATURE_MEDICAL_MEANING.get(name, ""),
            })

        # Sort by SHAP importance descending, return top 10
        results.sort(key=lambda x: x["shap"], reverse=True)
        return results[:10]

    def _fallback_features(self) -> list[dict]:
        """Return zeroed features if extraction fails."""
        names = list(FEATURE_MEDICAL_MEANING.keys())[:10]
        return [
            {
                "name": n,
                "raw_name": n,
                "value": 0.0,
                "norm_value": 0.0,
                "raw_value": 0.0,
                "shap": 0.0,
                "direction": "up",
                "medical_meaning": FEATURE_MEDICAL_MEANING.get(n, ""),
                "description": FEATURE_MEDICAL_MEANING.get(n, ""),
            }
            for n in names
        ]


# Singleton instance
_extractor_instance = None


def get_extractor() -> RadiomicsExtractor:
    global _extractor_instance
    if _extractor_instance is None:
        _extractor_instance = RadiomicsExtractor()
    return _extractor_instance