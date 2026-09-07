"""
NEUROSCAN AI — Diagnostic Report Routes (/api/reports/*)
========================================================
Locally generates and serves clinical radiology reports from analysis data.
NO external LLMs or third-party APIs used.
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
import uuid
import json

from database import get_db, DiagnosticReport, Scan, Analysis, Patient, Case, User
from auth import get_current_user, get_optional_user, log_audit_event
from report.report_generator import generate_clinical_report

router = APIRouter()


def _format_report(report: DiagnosticReport) -> dict:
    return {
        "id": report.id,
        "caseId": report.case_id,
        "scanId": report.scan_id,
        "patientId": report.patient_id,
        "version": report.version,
        "title": report.title,
        "summary": report.summary,
        "reportContent": report.report_content,
        "content": report.report_content,
        "filePath": report.file_path,
        "generatedAt": report.created_at.isoformat() + "Z" if report.created_at else None,
        "createdAt": report.created_at.isoformat() + "Z" if report.created_at else None,
    }


@router.get("/reports")
def list_reports(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
    limit: int = 50,
):
    reports = db.query(DiagnosticReport).order_by(desc(DiagnosticReport.created_at)).limit(limit).all()
    return [_format_report(r) for r in reports]


@router.get("/reports/{report_id}")
def get_report(
    report_id: str,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    report = db.query(DiagnosticReport).filter(DiagnosticReport.id == report_id).first()
    if not report:
        # Fallback: check if report_id was actually a scan_id
        report = db.query(DiagnosticReport).filter(DiagnosticReport.scan_id == report_id).order_by(desc(DiagnosticReport.version)).first()
    if not report:
        raise HTTPException(status_code=404, detail="Diagnostic report not found.")
    return _format_report(report)


@router.get("/scans/{scan_id}/reports")
def get_scan_reports(
    scan_id: str,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    reports = db.query(DiagnosticReport).filter(DiagnosticReport.scan_id == scan_id).order_by(desc(DiagnosticReport.version)).all()
    return [_format_report(r) for r in reports]


@router.post("/scans/{scan_id}/reports/generate")
def generate_report_for_scan(
    scan_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan or not scan.analysis:
        raise HTTPException(status_code=404, detail="Scan or analysis data not found.")

    ana = scan.analysis
    patient = scan.patient
    case = db.query(Case).filter(Case.scan_id == scan_id).first()

    # Determine version
    current_count = db.query(DiagnosticReport).filter(DiagnosticReport.scan_id == scan_id).count()
    new_version = current_count + 1

    # Prepare report data dict
    rad_features = json.loads(ana.radiomics_features_json or "[]")
    report_input = {
        "tumor_type":                ana.tumor_type,
        "tumor_class_raw":           ana.predicted_class,
        "confidence":                ana.confidence,
        "uncertainty":               ana.uncertainty,
        "uncertainty_tier":          ana.uncertainty_tier,
        "clinical_flag":             ana.clinical_flag,
        "entropy":                   ana.entropy or 0.0,
        "risk_level":                ana.risk_level,
        "risk_score":                ana.risk_score,
        "risk_recommendation":       ana.risk_recommendation,
        "followup":                  ana.followup or "",
        "top_radiomics_features":    rad_features,
        "segmentation_area_pixels":  ana.segmentation_area_pixels,
        "segmentation_area_percent": ana.segmentation_area_percent,
        "xai_methods_used":          ["Grad-CAM", "Grad-CAM++", "Integrated Gradients"],
    }

    report_text = generate_clinical_report(report_input)
    patient_name = patient.full_name if patient else "Patient"

    new_report = DiagnosticReport(
        id=str(uuid.uuid4()),
        case_id=case.id if case else None,
        scan_id=scan.id,
        patient_id=scan.patient_id,
        doctor_id=user.id if user else None,
        version=new_version,
        title=f"Diagnostic Report v{new_version} — {patient_name} ({ana.tumor_type})",
        summary=f"Automated AI screening indicates {ana.tumor_type} with {ana.confidence*100:.1f}% confidence and {ana.risk_level} risk tier.",
        report_content=report_text,
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    log_audit_event(
        db=db,
        action="GENERATE_REPORT",
        user=user,
        resource_type="report",
        resource_id=new_report.id,
        details=f"Generated Diagnostic Report v{new_version} for scan {scan.id}",
        request=request,
    )

    return _format_report(new_report)


@router.get("/reports/{report_id}/download")
def download_report(
    report_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    report = db.query(DiagnosticReport).filter(DiagnosticReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    log_audit_event(
        db=db,
        action="DOWNLOAD_REPORT",
        user=user,
        resource_type="report",
        resource_id=report.id,
        details=f"Downloaded report {report.title}",
        request=request,
    )

    filename = f"neuroscan_report_{report.id[:8]}.txt"
    return PlainTextResponse(
        content=report.report_content,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
