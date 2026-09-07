"""
NeuroVision Clinical Report Generator
======================================
Pure Python, template-based report generator. No external API calls, no LLM.
Uses conditional logic on all prediction data to produce a professional,
structured radiology report that reads exactly like a clinician-authored document.
"""
import json
from datetime import datetime, timezone
from typing import Dict, Any, List


# ─── Tumor-type narrative blocks ─────────────────────────────────────────────

_TUMOR_NARRATIVE = {
    "glioma": {
        "finding_summary": (
            "The AI analysis reveals imaging characteristics highly consistent with "
            "gliomatous pathology. The lesion demonstrates signal heterogeneity and "
            "ill-defined margins typical of infiltrative glial neoplasms."
        ),
        "location_note": (
            "Gliomas most commonly arise within the cerebral hemispheres and can "
            "involve the white matter tracts, often exhibiting mass effect on "
            "adjacent cortical structures."
        ),
        "clinical_significance": (
            "Gliomas represent the most common primary malignant brain tumors. "
            "Grading (WHO I-IV) via histopathological analysis is essential to "
            "determine prognosis and guide therapeutic strategy, including surgical "
            "resection, radiation therapy, and temozolomide chemotherapy."
        ),
        "urgency": "urgent",
    },
    "meningioma": {
        "finding_summary": (
            "Imaging features are consistent with a meningiomatous lesion. The "
            "lesion appears as a well-circumscribed, extra-axial mass with a "
            "broad dural base -- characteristic of meningeal origin."
        ),
        "location_note": (
            "Meningiomas typically arise from the dural meninges and are most "
            "frequently encountered along the cerebral convexities, falx cerebri, "
            "sphenoid wing, or at the skull base."
        ),
        "clinical_significance": (
            "Most meningiomas are WHO Grade I (benign) and grow slowly. However, "
            "atypical (Grade II) and anaplastic (Grade III) variants exist. "
            "Treatment decisions are guided by tumor size, growth rate, symptoms, "
            "and proximity to eloquent cortex."
        ),
        "urgency": "moderate",
    },
    "pituitary": {
        "finding_summary": (
            "The AI analysis identifies imaging features consistent with a pituitary "
            "region lesion. Sellar/parasellar signal abnormality is noted, with "
            "possible extension toward the suprasellar cistern."
        ),
        "location_note": (
            "Pituitary adenomas arise from the adenohypophysis and are classified "
            "as microadenomas (< 10 mm) or macroadenomas (>= 10 mm), the latter "
            "potentially causing mass effect on the optic chiasm."
        ),
        "clinical_significance": (
            "Most pituitary adenomas are benign, but may cause hormonal dysfunction "
            "(hyperprolactinemia, acromegaly, Cushing's disease) or visual field "
            "defects. Endocrinological assessment and ophthalmological review are "
            "essential components of clinical workup."
        ),
        "urgency": "moderate",
    },
    "notumor": {
        "finding_summary": (
            "No significant focal lesion or mass effect is identified on the "
            "submitted MRI acquisition. Brain parenchymal signal characteristics "
            "appear within normal limits for the imaging protocol utilised."
        ),
        "location_note": (
            "Visualised intracranial structures, including the cerebral hemispheres, "
            "posterior fossa, and midline structures, demonstrate no discrete "
            "space-occupying lesion."
        ),
        "clinical_significance": (
            "A negative AI screening result should be interpreted in conjunction "
            "with the full clinical presentation, patient symptomatology, and "
            "prior imaging comparisons. Clinical correlation is recommended if "
            "symptoms persist."
        ),
        "urgency": "routine",
    },
}

# ─── Confidence narrative ─────────────────────────────────────────────────────

def _confidence_phrase(confidence: float) -> str:
    if confidence >= 0.90:
        return "very high diagnostic confidence (>=90%)"
    elif confidence >= 0.75:
        return "high diagnostic confidence (>=75%)"
    elif confidence >= 0.60:
        return "moderate diagnostic confidence (>=60%)"
    else:
        return "low diagnostic confidence (<60%)"


def _uncertainty_phrase(tier: str, uncertainty: float) -> str:
    if tier == "LOW":
        return (
            f"Predictive uncertainty is low (std = {uncertainty:.4f}), "
            "indicating high model consistency across stochastic inference passes."
        )
    elif tier == "MEDIUM":
        return (
            f"Predictive uncertainty is moderate (std = {uncertainty:.4f}). "
            "The model shows some variability across stochastic passes, "
            "warranting corroboration with clinical findings."
        )
    else:
        return (
            f"Predictive uncertainty is elevated (std = {uncertainty:.4f}). "
            "Significant inter-pass variability was observed; independent "
            "radiologist review is strongly recommended before clinical action."
        )


def _risk_narrative(risk_level: str, risk_score: float, tumor_type: str) -> str:
    if risk_level == "HIGH":
        return (
            f"The composite risk score of {risk_score:.2f}/1.00 places this case "
            f"in the HIGH RISK category. Given the predicted {tumor_type} diagnosis "
            "and lesion characteristics, this warrants urgent clinical escalation."
        )
    elif risk_level == "MEDIUM":
        return (
            f"The composite risk score of {risk_score:.2f}/1.00 places this case "
            f"in the MEDIUM RISK category. The predicted {tumor_type} finding "
            "requires structured follow-up and clinical correlation."
        )
    else:
        return (
            f"The composite risk score of {risk_score:.2f}/1.00 places this case "
            "in the LOW RISK category. No immediate escalation is indicated; "
            "routine surveillance protocols should be followed."
        )


def _radiomics_narrative(features: List[dict]) -> str:
    if not features:
        return (
            "Quantitative radiomics analysis was not available for this case. "
            "Standard visual assessment applies."
        )
    top = features[:3]
    parts = []
    for f in top:
        direction_word = "elevated" if f.get("direction") == "up" else "reduced"
        parts.append(f"{f['name']} ({direction_word}, value: {f['value']:.3g})")
    feature_str = "; ".join(parts)
    return (
        f"Quantitative radiomics analysis identified the following dominant "
        f"imaging biomarkers: {feature_str}. These features contribute most "
        "significantly to the classification decision as assessed by SHAP "
        "importance scoring."
    )


def _segmentation_narrative(area_pixels: int, area_percent: float, is_tumor: bool) -> str:
    if not is_tumor:
        return (
            "Segmentation analysis was not performed as no tumor was detected. "
            "Pseudo-label based segmentation is reserved for lesion-positive cases."
        )
    if area_pixels == 0:
        return (
            "Segmentation mask generation was completed but yielded a near-zero "
            "lesion area. This may indicate a microlesion below the resolution "
            "threshold or a borderline case."
        )
    return (
        f"Pseudo-label segmentation (Attention U-Net, trained on Grad-CAM derived "
        f"pseudo-masks) delineated an approximate lesion area of {area_pixels:,} pixels "
        f"({area_percent:.1f}% of total image area). This provides an initial "
        "volumetric estimate pending manual contouring."
    )


def _recommendations(tumor_type: str, risk_level: str, uncertainty_tier: str, followup: str) -> List[str]:
    recs = []

    # Tumor-type specific
    if tumor_type == "glioma":
        recs += [
            "Urgent neurosurgical consultation is recommended.",
            "MRI with gadolinium contrast enhancement (T1 post-contrast, FLAIR, DWI) is advised for complete staging.",
            "Stereotactic biopsy or surgical resection should be considered for tissue diagnosis and WHO grading.",
            "Multidisciplinary neuro-oncology team review is strongly recommended.",
        ]
    elif tumor_type == "meningioma":
        recs += [
            "MRI with gadolinium contrast is recommended to assess dural tail sign and vascular involvement.",
            "Neurosurgical and/or radiation oncology consultation should be arranged.",
            "Observation with serial MRI may be appropriate for asymptomatic, small lesions.",
            "Assessment of proximity to eloquent cortex and cranial nerve involvement is advised.",
        ]
    elif tumor_type == "pituitary":
        recs += [
            "Complete endocrinological panel is recommended (GH, IGF-1, prolactin, ACTH, cortisol, TSH, LH, FSH).",
            "Formal Goldmann perimetry or automated visual field testing is advised to assess chiasmal compression.",
            "Dedicated pituitary MRI protocol with thin-slice coronal and sagittal sequences is recommended.",
            "Endocrinology and neurosurgery joint consultation is appropriate.",
        ]
    else:  # notumor
        recs += [
            "No immediate intervention is indicated based on the current AI analysis.",
            "Clinical correlation with patient symptomatology remains essential.",
            "Routine annual MRI screening may be considered if risk factors are present.",
            "If symptoms persist or worsen, repeat imaging at 6-month intervals is advised.",
        ]

    # Risk-level additions
    if risk_level == "HIGH" and tumor_type != "notumor":
        recs.append(followup)
    elif risk_level == "MEDIUM":
        recs.append(followup)

    # Uncertainty addition
    if uncertainty_tier == "HIGH":
        recs.append(
            "Due to elevated model uncertainty, independent review by a board-certified "
            "neuroradiologist is mandatory before any clinical decision."
        )
    elif uncertainty_tier == "MEDIUM":
        recs.append(
            "Moderate uncertainty was detected. Clinical and imaging correlation "
            "with prior studies is recommended."
        )

    return recs


# ─── Main Report Generator ────────────────────────────────────────────────────

def generate_clinical_report(prediction_data: Dict[str, Any]) -> str:
    """
    Generate a professional radiology-style clinical report from prediction data.

    Args:
        prediction_data: dict containing all prediction fields from the pipeline.

    Returns:
        str: Formatted multi-section clinical report text.
    """
    # ── Unpack inputs ────────────────────────────────────────────────────────
    tumor_type       = prediction_data.get("tumor_class_raw", "notumor")
    tumor_display    = prediction_data.get("tumor_type", "Unknown")
    confidence       = float(prediction_data.get("confidence", 0.0))
    uncertainty      = float(prediction_data.get("uncertainty", 0.0))
    uncertainty_tier = prediction_data.get("uncertainty_tier", "MEDIUM")
    clinical_flag    = prediction_data.get("clinical_flag", "")
    entropy          = float(prediction_data.get("entropy", 0.0))
    risk_level       = prediction_data.get("risk_level", "MEDIUM")
    risk_score       = float(prediction_data.get("risk_score", 0.0))
    risk_rec         = prediction_data.get("risk_recommendation", "")
    followup         = prediction_data.get("followup", "")
    features         = prediction_data.get("top_radiomics_features", [])
    area_pixels      = int(prediction_data.get("segmentation_area_pixels", 0))
    area_percent     = float(prediction_data.get("segmentation_area_percent", 0.0))
    xai_methods      = prediction_data.get("xai_methods_used", [])
    is_tumor         = tumor_type != "notumor"

    # ── Narrative blocks ─────────────────────────────────────────────────────
    narr = _TUMOR_NARRATIVE.get(tumor_type, _TUMOR_NARRATIVE["notumor"])

    now_utc      = datetime.now(timezone.utc)
    report_dt    = now_utc.strftime("%Y-%m-%d %H:%M UTC")
    conf_phrase  = _confidence_phrase(confidence)
    unc_phrase   = _uncertainty_phrase(uncertainty_tier, uncertainty)
    risk_narr    = _risk_narrative(risk_level, risk_score, tumor_display)
    rad_narr     = _radiomics_narrative(features)
    seg_narr     = _segmentation_narrative(area_pixels, area_percent, is_tumor)
    recs         = _recommendations(tumor_type, risk_level, uncertainty_tier, followup)

    xai_list     = ", ".join(xai_methods) if xai_methods else "Grad-CAM, Grad-CAM++, Score-CAM, Integrated Gradients"

    # ── Impression statement ─────────────────────────────────────────────────
    if is_tumor:
        impression = (
            f"AI analysis suggests the presence of a {tumor_display} with "
            f"{conf_phrase}. {narr['clinical_significance'].split('.')[0]}."
        )
    else:
        impression = (
            "AI analysis does not identify a discrete intracranial mass lesion. "
            "Findings are consistent with a normal MRI screening result within "
            "the limitations of the AI model. Clinical correlation is advised."
        )

    # ── Build the report text ─────────────────────────────────────────────────
    rec_bullets = "\n".join(f"  - {r}" for r in recs)

    report = f"""{'='*60}
NEUROSCAN AI CLINICAL RADIOLOGY REPORT
{'='*60}

Study Type   : Brain MRI -- Tumor Classification & Feature Analysis
AI Model     : NEUROSCAN AI v3.0 (CNN-ViT Hybrid Architecture)
Analysis Date: {report_dt}
XAI Methods  : {xai_list}

{'-'*60}
FINDINGS & MORPHOLOGY
{'-'*60}
{narr['finding_summary']}

{narr['location_note']}

Classification: {tumor_display.upper()}
Confidence Score: {confidence*100:.1f}% ({conf_phrase})

{'-'*60}
QUANTITATIVE NEURAL ANALYSIS
{'-'*60}
Model Output:
  * Primary Classification  : {tumor_display}
  * Softmax Confidence      : {confidence*100:.1f}%
  * Predictive Entropy      : {entropy:.4f} nats
  * Uncertainty Tier        : {uncertainty_tier}

{unc_phrase}

{seg_narr}

{'-'*60}
RADIOMICS BIOMARKERS & SHAP RANKING
{'-'*60}
{rad_narr}

{'-'*60}
DIAGNOSTIC IMPRESSION
{'-'*60}
{impression}

{'-'*60}
RISK ASSESSMENT: {risk_level} RISK  [Composite Score: {risk_score:.2f}/1.00]
{'-'*60}
{risk_narr}

Clinical Advisory: {risk_rec}

{'-'*60}
CLINICAL RECOMMENDATIONS & NEXT STEPS
{'-'*60}
{rec_bullets}

{'-'*60}
MANDATORY MEDICAL & LEGAL DISCLAIMER
{'-'*60}
This diagnostic report is generated by an artificial intelligence decision-support
tool (NEUROSCAN AI v3.0). This system is an AI-assisted research/demo tool and is
not a replacement for professional medical diagnosis. Findings MUST be reviewed
and verified by a licensed, board-certified radiologist or neurosurgeon prior
to any clinical intervention or surgical action.

Model: CNN-ViT Hybrid | Uncertainty: 50 Monte Carlo Dropout Passes
{'='*60}"""

    return report.strip()
