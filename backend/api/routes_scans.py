"""
NEUROSCAN AI — Scan Ingestion & Analysis Pipeline Routes (/api/scans/*)
======================================================================
Handles MRI scan upload, ML pipeline execution, detailed scan retrieval,
and case/report auto-generation.
"""
import json
import time
import os
import uuid
from io import BytesIO
from pathlib import Path
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from PIL import Image

from database import get_db, Patient, Scan, Analysis, Case, DiagnosticReport, User, create_notification
from auth import get_current_user, get_optional_user, log_audit_event
from config import BASE_DIR, CLASS_DISPLAY, MAX_UPLOAD_SIZE_BYTES, ALLOWED_IMAGE_EXTENSIONS

router = APIRouter()

UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)


def validate_image_security(contents: bytes, filename: str) -> None:
    """
    Validates uploaded medical scan integrity:
      - Max file size enforcement
      - Extension whitelist
      - Magic byte signature validation
    """
    if len(contents) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed upload size of {MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB."
        )

    ext = Path(filename).suffix.lower() if filename else ".jpg"
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed medical image extensions: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}"
        )

    # Magic bytes check
    is_valid_magic = (
        contents.startswith(b"\xff\xd8\xff") or          # JPEG
        contents.startswith(b"\x89PNG\r\n\x1a\n") or      # PNG
        contents.startswith(b"BM") or                    # BMP
        contents.startswith(b"RIFF") or                  # WEBP
        contents.startswith(b"II*\x00") or               # TIFF little-endian
        contents.startswith(b"MM\x00*")                  # TIFF big-endian
    )
    if not is_valid_magic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File integrity check failed: file header does not match a valid medical image format."
        )


def get_predictor(request: Request):
    return request.app.state.predictor



def _format_scan_detail(scan: Scan) -> dict:
    ana = scan.analysis
    patient = scan.patient
    user = scan.user

    analysis_data = {}
    if ana:
        class_probs = json.loads(ana.class_probabilities_json or "{}")
        std_probs   = json.loads(ana.std_probabilities_json   or "{}")
        radiomics   = json.loads(ana.radiomics_features_json  or "[]")
        faithfulness= json.loads(ana.xai_faithfulness_json    or "{}")

        analysis_data = {
            "prediction_id":            ana.id,
            "predicted_class":          ana.predicted_class,
            "tumor_class_raw":          ana.predicted_class,
            "tumor_type":               ana.tumor_type,
            "confidence":               ana.confidence,
            "uncertainty":              ana.uncertainty,
            "uncertainty_tier":         ana.uncertainty_tier,
            "clinical_flag":            ana.clinical_flag,
            "entropy":                  ana.entropy,
            "risk_level":               ana.risk_level,
            "risk_score":               ana.risk_score,
            "risk_recommendation":      ana.risk_recommendation,
            "followup":                 ana.followup,
            "class_probabilities":      class_probs,
            "std_probabilities":        std_probs,
            "top_radiomics_features":   radiomics,
            "radiomics_features":       radiomics,
            "clinical_report":          ana.clinical_report,
            "model_variant":            ana.model_variant,
            "processing_time_ms":       ana.processing_time_ms,
            "xai": {
                "gradcam":              ana.xai_gradcam_b64,
                "gradcam_plus":         ana.xai_gradcam_plus_b64,
                "scorecam":             ana.xai_scorecam_b64,
                "integrated_gradients": ana.xai_integrated_gradients_b64,
                "faithfulness":         faithfulness,
            },
            "segmentation": {
                "mask_overlay":         ana.mask_overlay_b64,
                "tumor_area_pixels":    ana.segmentation_area_pixels,
                "tumor_area_percent":   ana.segmentation_area_percent,
            },
            "features": {
                "texture": float(radiomics[0].get("norm_value", radiomics[0].get("value", 0.5))) if len(radiomics) > 0 and isinstance(radiomics[0], dict) else 0.5,
                "shape":   float(radiomics[1].get("norm_value", radiomics[1].get("value", 0.5))) if len(radiomics) > 1 and isinstance(radiomics[1], dict) else 0.5,
                "intensity": float(radiomics[2].get("norm_value", radiomics[2].get("value", 0.5))) if len(radiomics) > 2 and isinstance(radiomics[2], dict) else 0.5,
            },
            "isArchived": scan.is_archived,
        }

    return {
        "id":                       scan.id,
        "patientId":                patient.id if patient else None,
        "patientCode":              patient.patient_code if patient else None,
        "patientName":              patient.full_name if patient else "Unknown Patient",
        "patientAge":               patient.age if patient else None,
        "patientGender":            patient.gender if patient else None,
        "patientAddress":           patient.address if patient else None,
        "patientPhoneNumber":       patient.phone_number if patient else None,
        "hospitalName":             patient.hospital_name if patient else "NeuroScan Medical Center",
        "fileName":                 scan.filename,
        "imageUrl":                 scan.image_url or f"/uploads/{scan.filename}",
        "status":                   scan.status,
        "tumorDetected":            (ana.predicted_class != "notumor") if ana else False,
        "tumorType":                ana.tumor_type if ana else None,
        "confidence":               ana.confidence if ana else None,
        "uncertainty":              ana.uncertainty if ana else None,
        "uncertaintyTier":          ana.uncertainty_tier if ana else None,
        "riskLevel":                ana.risk_level if ana else None,
        "riskScore":                ana.risk_score if ana else None,
        "tumorLocation":            "Cerebral Hemisphere" if (ana and ana.predicted_class != "notumor") else "None",
        "tumorSize":                f"{ana.segmentation_area_percent:.1f}% volume" if (ana and ana.segmentation_area_pixels > 0) else "N/A",
        "analysisData":             analysis_data,
        "uploadedAt":               scan.created_at.isoformat() + "Z" if scan.created_at else None,
        "createdAt":                scan.created_at.isoformat() + "Z" if scan.created_at else None,
        "uploadedBy":               user.full_name if user else "Staff",
    }


@router.post("/scans/upload")
async def upload_and_analyze_scan(
    request: Request,
    scan: UploadFile = File(...),
    patientId: Optional[str] = Form(None),
    patientName: Optional[str] = Form(None),
    patientAge: Optional[str] = Form(None),
    patientGender: Optional[str] = Form(None),
    patientAddress: Optional[str] = Form(None),
    patientPhoneNumber: Optional[str] = Form(None),
    hospitalName: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    """
    Primary MRI Upload & Analysis Endpoint.
    Executes full ML Pipeline on uploaded MRI scan and auto-creates Case + Report.
    """
    predictor = get_predictor(request)
    if predictor is None:
        raise HTTPException(status_code=503, detail="ML Model predictor is initializing. Please retry in a few seconds.")

    # 1. Validate file with security checks (magic bytes, size, ext)
    contents = await scan.read()
    validate_image_security(contents, scan.filename or "scan.jpg")

    try:
        image = Image.open(BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse image file. Ensure it is a valid MRI image.")

    # 2. Save image to uploads/
    scan_id = str(uuid.uuid4())
    ext = Path(scan.filename).suffix if scan.filename else ".jpg"
    if not ext:
        ext = ".jpg"
    saved_filename = f"scan_{scan_id[:8]}_{int(time.time())}{ext}"
    saved_path = UPLOADS_DIR / saved_filename
    with open(saved_path, "wb") as f:
        f.write(contents)

    image_url = f"/uploads/{saved_filename}"

    # 3. Patient resolution
    patient_name_val = (patientName or "Anonymous Patient").strip()
    patient = None
    if patientId:
        patient = db.query(Patient).filter((Patient.id == patientId) | (Patient.patient_code == patientId)).first()

    if not patient:
        # Check if patient name exists or create new with guaranteed unique code
        if patientId:
            candidate_code = patientId
        else:
            p_idx = db.query(Patient).count() + 1
            candidate_code = f"PT-2026-{p_idx:04d}"
            while db.query(Patient).filter(Patient.patient_code == candidate_code).first():
                p_idx += 1
                candidate_code = f"PT-2026-{p_idx:04d}"
        patient_code = candidate_code
        age_val = None
        if patientAge and patientAge.isdigit():
            age_val = int(patientAge)

        patient = Patient(
            id=str(uuid.uuid4()),
            patient_code=patient_code,
            full_name=patient_name_val,
            age=age_val,
            gender=patientGender or "Unspecified",
            hospital_name=hospitalName or "NeuroScan Medical Center",
            phone_number=patientPhoneNumber,
            address=patientAddress,
            created_by_id=user.id if user else None,
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)

    # 4. Create Scan record
    scan_record = Scan(
        id=scan_id,
        patient_id=patient.id,
        user_id=user.id if user else None,
        filename=saved_filename,
        file_path=str(saved_path),
        image_url=image_url,
        status="completed",
        is_archived=False,
    )
    db.add(scan_record)
    db.commit()

    # 5. Execute ML Pipeline
    t_start = time.time()
    try:
        result = predictor.predict(image, filename=scan.filename or saved_filename)
    except Exception as e:
        scan_record.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"ML Pipeline execution failed: {str(e)}")

    # 6. Save Analysis record
    xai = result.get("xai", {})
    seg = result.get("segmentation", {})
    rad_features = result.get("top_radiomics_features", [])

    analysis_record = Analysis(
        id=result.get("prediction_id", str(uuid.uuid4())),
        scan_id=scan_record.id,
        patient_id=patient.id,
        user_id=user.id if user else None,
        predicted_class=result["tumor_class_raw"],
        tumor_type=result["tumor_type"],
        confidence=result["confidence"],
        uncertainty=result["uncertainty"],
        uncertainty_tier=result["uncertainty_tier"],
        clinical_flag=result["clinical_flag"],
        entropy=result["entropy"],
        risk_level=result["risk_level"],
        risk_score=result["risk_score"],
        risk_recommendation=result["risk_recommendation"],
        followup=result.get("followup", ""),
        segmentation_area_pixels=seg.get("tumor_area_pixels", 0),
        segmentation_area_percent=seg.get("tumor_area_percent", 0.0),
        mask_overlay_b64=seg.get("mask_overlay"),
        xai_gradcam_b64=xai.get("gradcam"),
        xai_gradcam_plus_b64=xai.get("gradcam_plus"),
        xai_scorecam_b64=xai.get("scorecam"),
        xai_integrated_gradients_b64=xai.get("integrated_gradients"),
        xai_faithfulness_json=json.dumps(xai.get("faithfulness", {})),
        class_probabilities_json=json.dumps(result.get("class_probabilities", {})),
        std_probabilities_json=json.dumps(result.get("std_probabilities", {})),
        radiomics_features_json=json.dumps(rad_features),
        clinical_report=result.get("clinical_report", ""),
        model_variant=result.get("model_variant", "hybrid"),
        processing_time_ms=result.get("processing_time_ms", int((time.time() - t_start) * 1000)),
    )
    db.add(analysis_record)

    # 7. Create Case record
    c_idx = db.query(Case).count() + 1
    candidate_case = f"CASE-2026-{c_idx:04d}"
    while db.query(Case).filter(Case.case_number == candidate_case).first():
        c_idx += 1
        candidate_case = f"CASE-2026-{c_idx:04d}"
    case_num = candidate_case
    priority = "urgent" if result["risk_level"] == "HIGH" else ("medium" if result["risk_level"] == "MEDIUM" else "low")
    
    case_record = Case(
        id=str(uuid.uuid4()),
        case_number=case_num,
        patient_id=patient.id,
        scan_id=scan_record.id,
        analysis_id=analysis_record.id,
        assigned_doctor_id=user.id if (user and user.role == "doctor") else None,
        status="active",
        priority=priority,
        notes=f"AI Detection: {result['tumor_type']} ({result['confidence']*100:.1f}% confidence, {result['risk_level']} risk).",
    )
    db.add(case_record)

    # 8. Create Diagnostic Report record
    report_record = DiagnosticReport(
        id=str(uuid.uuid4()),
        case_id=case_record.id,
        scan_id=scan_record.id,
        patient_id=patient.id,
        doctor_id=user.id if user else None,
        version=1,
        title=f"Diagnostic Report — {patient.full_name} ({result['tumor_type']})",
        summary=f"Automated AI screening indicates {result['tumor_type']} with {result['confidence']*100:.1f}% confidence and {result['risk_level']} risk tier.",
        report_content=result.get("clinical_report", ""),
    )
    db.add(report_record)
    db.commit()

    # 9. Trigger In-App Clinical Notifications
    create_notification(
        db=db,
        title="Analysis Completed",
        message=f"Analysis completed for Patient ID {patient.patient_code} ({patient.full_name}): {result['tumor_type']} ({result['confidence']*100:.1f}% confidence)",
        type="urgent" if result["risk_level"] == "HIGH" else "success",
        target_role="doctor",
        link=f"/scan/{scan_record.id}",
    )

    create_notification(
        db=db,
        title="Diagnostic Report Available",
        message=f"New diagnostic report is available for Case {case_record.case_number} ({patient.full_name}).",
        type="info",
        target_role="doctor",
        link=f"/report/{report_record.id}",
    )

    if case_record.assigned_doctor_id:
        create_notification(
            db=db,
            title="Case Assigned",
            message=f"Case {case_record.case_number} ({patient.full_name}) has been assigned to you.",
            type="info",
            user_id=case_record.assigned_doctor_id,
            link="/cases",
        )

    # 10. Audit log
    log_audit_event(
        db=db,
        action="UPLOAD_AND_ANALYZE_SCAN",
        user=user,
        resource_type="scan",
        resource_id=scan_record.id,
        details=f"Analyzed MRI for patient '{patient.full_name}'. Classified: {result['tumor_type']} (Conf: {result['confidence']*100:.1f}%)",
        request=request,
    )

    db.refresh(scan_record)
    return _format_scan_detail(scan_record)


@router.get("/scans")
def list_scans(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
    limit: int = 100,
):
    scans = db.query(Scan).order_by(desc(Scan.created_at)).limit(limit).all()
    return [_format_scan_detail(s) for s in scans]


@router.get("/scans/{scan_id}")
def get_scan(
    scan_id: str,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail=f"Scan '{scan_id}' not found.")
    return _format_scan_detail(scan)


@router.post("/scans/{scan_id}/archive")
def toggle_archive_scan(
    scan_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found.")
    
    scan.is_archived = not scan.is_archived
    db.commit()

    log_audit_event(
        db=db,
        action="ARCHIVE_SCAN" if scan.is_archived else "UNARCHIVE_SCAN",
        user=user,
        resource_type="scan",
        resource_id=scan.id,
        details=f"{'Archived' if scan.is_archived else 'Unarchived'} scan '{scan.filename}'",
        request=request,
    )

    return {"message": f"Scan {'archived' if scan.is_archived else 'unarchived'} successfully.", "isArchived": scan.is_archived}
