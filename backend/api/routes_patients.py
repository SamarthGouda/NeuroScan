"""
NEUROSCAN AI — Patient Management Routes (/api/patients/*)
==========================================================
Handles patient registration and clinical record lookups.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
import uuid

from database import get_db, Patient, Scan, Case, Analysis, User
from auth import get_current_user, log_audit_event

router = APIRouter()


class PatientCreateRequest(BaseModel):
    patient_code: Optional[str] = None
    full_name: str = Field(..., min_length=2, max_length=100)
    age: Optional[int] = None
    gender: Optional[str] = None
    hospital_name: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None


def _format_patient(patient: Patient, include_scans: bool = False) -> dict:
    scans_list = []
    if include_scans and patient.scans:
        for s in patient.scans:
            ana = s.analysis
            scans_list.append({
                "id": s.id,
                "filename": s.filename,
                "imageUrl": s.image_url,
                "status": s.status,
                "createdAt": s.created_at.isoformat() + "Z" if s.created_at else None,
                "predictedClass": ana.predicted_class if ana else None,
                "tumorType": ana.tumor_type if ana else None,
                "confidence": ana.confidence if ana else None,
                "riskLevel": ana.risk_level if ana else None,
            })

    return {
        "id": patient.id,
        "patientCode": patient.patient_code,
        "fullName": patient.full_name,
        "age": patient.age,
        "gender": patient.gender,
        "hospitalName": patient.hospital_name or "NeuroScan Medical Center",
        "phoneNumber": patient.phone_number,
        "address": patient.address,
        "createdAt": patient.created_at.isoformat() + "Z" if patient.created_at else None,
        "totalScans": len(patient.scans) if patient.scans else 0,
        "scans": scans_list if include_scans else None,
    }


@router.get("/patients")
def list_patients(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patients = db.query(Patient).order_by(desc(Patient.created_at)).all()
    return [_format_patient(p, include_scans=True) for p in patients]


@router.post("/patients")
def create_patient(
    req: PatientCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    code = req.patient_code
    if not code:
        # Generate sequential code
        count = db.query(Patient).count() + 1
        code = f"PT-2026-{count:04d}"

    existing = db.query(Patient).filter(Patient.patient_code == code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Patient ID '{code}' already exists.")

    new_patient = Patient(
        id=str(uuid.uuid4()),
        patient_code=code,
        full_name=req.full_name.strip(),
        age=req.age,
        gender=req.gender,
        hospital_name=req.hospital_name or "NeuroScan Medical Center",
        phone_number=req.phone_number,
        address=req.address,
        created_by_id=user.id,
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    log_audit_event(
        db=db,
        action="CREATE_PATIENT",
        user=user,
        resource_type="patient",
        resource_id=new_patient.id,
        details=f"Registered patient '{new_patient.full_name}' ({new_patient.patient_code})",
        request=request,
    )

    return _format_patient(new_patient)


@router.get("/patients/{patient_id}")
def get_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patient = db.query(Patient).filter(
        (Patient.id == patient_id) | (Patient.patient_code == patient_id)
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    return _format_patient(patient, include_scans=True)
