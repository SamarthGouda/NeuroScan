"""
History endpoints:
  GET /api/history          — last 50 predictions
  GET /api/prediction/{id}  — single prediction details
"""
import json
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db, Prediction, AuditLog

router = APIRouter()


def _row_to_dict(row: Prediction) -> dict:
    return {
        "id":               row.id,
        "timestamp":        row.timestamp.isoformat() + "Z",
        "image_filename":   row.image_filename,
        "predicted_class":  row.predicted_class,
        "confidence":       row.confidence,
        "uncertainty":      row.uncertainty,
        "uncertainty_tier": row.uncertainty_tier,
        "risk_level":       row.risk_level,
        "risk_score":       row.risk_score,
        "entropy":          row.entropy,
        "class_probabilities": json.loads(row.class_probabilities or "{}"),
        "std_probabilities":   json.loads(row.std_probabilities   or "{}"),
        "radiomics_features":  json.loads(row.radiomics_features  or "[]"),
        "clinical_report":  row.clinical_report,
        "processing_time_ms": row.processing_time_ms,
    }


@router.get("/history")
def get_history(
    request: Request,
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    predicted_class: str = Query(None),
    risk_level: str = Query(None),
):
    q = db.query(Prediction).order_by(desc(Prediction.timestamp))
    if predicted_class:
        q = q.filter(Prediction.predicted_class == predicted_class)
    if risk_level:
        q = q.filter(Prediction.risk_level == risk_level)
    rows = q.limit(limit).all()

    # Log
    try:
        db.add(AuditLog(
            action="VIEW_HISTORY",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        ))
        db.commit()
    except Exception:
        pass

    return [_row_to_dict(r) for r in rows]


@router.get("/prediction/{prediction_id}")
def get_prediction(prediction_id: str, db: Session = Depends(get_db)):
    row = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Prediction not found.")
    return _row_to_dict(row)
