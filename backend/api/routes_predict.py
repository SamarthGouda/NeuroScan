"""
NEUROSCAN AI — Direct ML Prediction Endpoint (/api/predict)
===========================================================
Accepts multipart image upload, executes full ML pipeline, persists
scan & analysis records, and returns full inference JSON.
"""
from io import BytesIO
from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from PIL import Image
import uuid
import time
import json
from pathlib import Path

from database import get_db, Scan, Analysis, Patient, User, create_notification
from auth import get_optional_user, log_audit_event
from config import BASE_DIR, MAX_UPLOAD_SIZE_BYTES, ALLOWED_IMAGE_EXTENSIONS
from api.routes_scans import validate_image_security

router = APIRouter()

UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)


def get_predictor(request: Request):
    return request.app.state.predictor


@router.post("/predict")
async def predict(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_optional_user),
):
    predictor = get_predictor(request)
    if predictor is None:
        raise HTTPException(status_code=503, detail="ML Model predictor is not loaded.")

    contents = await file.read()
    validate_image_security(contents, file.filename or "scan.jpg")

    try:
        image = Image.open(BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse MRI image file.")

    # Save to disk
    scan_id = str(uuid.uuid4())
    ext = Path(file.filename).suffix if file.filename else ".jpg"
    if not ext:
        ext = ".jpg"
    saved_filename = f"scan_{scan_id[:8]}_{int(time.time())}{ext}"
    saved_path = UPLOADS_DIR / saved_filename
    with open(saved_path, "wb") as f:
        f.write(contents)

    # Run ML pipeline
    try:
        result = predictor.predict(image, filename=file.filename or "upload.jpg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction pipeline failed: {str(e)}")

    # Auto-link patient & scan in DB
    try:
        patient = db.query(Patient).first()
        if not patient:
            patient = Patient(
                id=str(uuid.uuid4()),
                patient_code="PT-2026-0001",
                full_name="Quick Screening Patient",
                hospital_name="NeuroScan Medical Center",
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)

        scan_row = Scan(
            id=scan_id,
            patient_id=patient.id,
            user_id=user.id if user else None,
            filename=saved_filename,
            file_path=str(saved_path),
            image_url=f"/uploads/{saved_filename}",
            status="completed",
        )
        db.add(scan_row)
        db.commit()

        xai = result.get("xai", {})
        seg = result.get("segmentation", {})
        rad = result.get("top_radiomics_features", [])

        analysis_row = Analysis(
            id=result.get("prediction_id", str(uuid.uuid4())),
            scan_id=scan_row.id,
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
            radiomics_features_json=json.dumps(rad),
            clinical_report=result.get("clinical_report", ""),
            model_variant=result.get("model_variant", "hybrid"),
            processing_time_ms=result.get("processing_time_ms", 0),
        )
        db.add(analysis_row)
        db.commit()

        create_notification(
            db=db,
            title="MRI Analysis Completed",
            message=f"Direct analysis completed: {result['tumor_type']} ({result['confidence']*100:.1f}% confidence)",
            type="urgent" if result.get("risk_level") == "HIGH" else "success",
            target_role="doctor",
            link=f"/scan/{scan_row.id}",
        )

        log_audit_event(
            db=db,
            action="DIRECT_PREDICT",
            user=user,
            resource_type="analysis",
            resource_id=analysis_row.id,
            details=f"Direct prediction: {result['tumor_type']} (Conf: {result['confidence']*100:.1f}%)",
            request=request,
        )
    except Exception as e:
        print(f"[API] Warning: DB persistence failed during predict: {e}")

    # Remove internal _db_payload before returning
    result.pop("_db_payload", None)
    result["scan_id"] = scan_id
    result["image_url"] = f"/uploads/{saved_filename}"
    return result
