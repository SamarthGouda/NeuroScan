"""
NEUROSCAN AI — Case Management Routes (/api/cases/*)
====================================================
Allows clinicians and administrators to track, review, prioritize,
and manage patient MRI analysis cases.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List

from database import get_db, Case, Patient, Scan, Analysis, User, DiagnosticReport
from auth import get_current_user, get_optional_user, log_audit_event

router = APIRouter()


class CaseUpdateRequest(BaseModel):
    status: Optional[str] = None       # active | under_review | completed
    priority: Optional[str] = None     # low | medium | high | urgent
    notes: Optional[str] = None
    assigned_doctor_id: Optional[str] = None


def _format_case(case: Case) -> dict:
    patient = case.patient
    scan = case.scan
    analysis = scan.analysis if scan else None
    doctor = case.assigned_doctor

    reports_count = len(case.reports) if case.reports else 0

    return {
        "id": case.id,
        "caseNumber": case.case_number,
        "patientId": patient.id if patient else None,
        "patientCode": patient.patient_code if patient else None,
        "patientName": patient.full_name if patient else "Unknown Patient",
        "patientAge": patient.age if patient else None,
        "patientGender": patient.gender if patient else None,
        "hospitalName": patient.hospital_name if patient else "NeuroScan Medical Center",
        "scanId": scan.id if scan else None,
        "imageUrl": scan.image_url if scan else None,
        "status": case.status,
        "priority": case.priority,
        "notes": case.notes,
        "tumorType": analysis.tumor_type if analysis else "Under Analysis",
        "predictedClass": analysis.predicted_class if analysis else None,
        "confidence": analysis.confidence if analysis else None,
        "riskLevel": analysis.risk_level if analysis else "MEDIUM",
        "assignedDoctor": doctor.full_name if doctor else "Unassigned",
        "assignedDoctorId": doctor.id if doctor else None,
        "reportsCount": reports_count,
        "createdAt": case.created_at.isoformat() + "Z" if case.created_at else None,
        "updatedAt": case.updated_at.isoformat() + "Z" if case.updated_at else None,
    }


@router.get("/cases")
def list_cases(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    q = db.query(Case).order_by(desc(Case.created_at))
    if status:
        q = q.filter(Case.status == status)
    if priority:
        q = q.filter(Case.priority == priority)
    cases = q.all()
    return [_format_case(c) for c in cases]


@router.get("/cases/{case_id}")
def get_case(
    case_id: str,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    return _format_case(case)


@router.put("/cases/{case_id}")
def update_case(
    case_id: str,
    req: CaseUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    if req.status:
        case.status = req.status
    if req.priority:
        case.priority = req.priority
    if req.notes is not None:
        case.notes = req.notes
    if req.assigned_doctor_id:
        case.assigned_doctor_id = req.assigned_doctor_id

    db.commit()
    db.refresh(case)

    log_audit_event(
        db=db,
        action="UPDATE_CASE",
        user=user,
        resource_type="case",
        resource_id=case.id,
        details=f"Updated case {case.case_number}: status={case.status}, priority={case.priority}",
        request=request,
    )

    return _format_case(case)
