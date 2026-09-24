"""
NEUROSCAN AI — Database Models and Session Management
=====================================================
Database: SQLite via SQLAlchemy
Tables:
  - users
  - patients
  - scans
  - analyses
  - cases
  - diagnostic_reports
  - audit_logs
"""
import uuid
import json
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column, String, Float, Integer, Boolean, Text, DateTime, ForeignKey, create_engine, desc
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import DATABASE_URL

connect_args = {}
engine_kwargs = {}

if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
else:
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ─── Models ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username      = Column(String(50), unique=True, nullable=False, index=True)
    email         = Column(String(120), unique=True, nullable=False, index=True)
    full_name     = Column(String(100), nullable=False)
    role          = Column(String(20), nullable=False, default="doctor")   # doctor | technician | admin
    password_hash = Column(String(255), nullable=False)
    title         = Column(String(100), nullable=True)                    # e.g., "Senior Neuroradiologist"
    avatar        = Column(String(10), nullable=True)                     # Initials, e.g., "SC"
    is_active     = Column(Boolean, default=True, nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow)

    # Relationships
    scans         = relationship("Scan", back_populates="user")
    cases         = relationship("Case", back_populates="assigned_doctor")


class Patient(Base):
    __tablename__ = "patients"

    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_code  = Column(String(50), unique=True, nullable=False, index=True)  # e.g., "PT-2026-001"
    full_name     = Column(String(100), nullable=False)
    age           = Column(Integer, nullable=True)
    gender        = Column(String(20), nullable=True)                    # Male | Female | Other
    hospital_name = Column(String(150), nullable=True)
    phone_number  = Column(String(50), nullable=True)
    address       = Column(String(255), nullable=True)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

    # Relationships
    scans         = relationship("Scan", back_populates="patient", cascade="all, delete-orphan")
    cases         = relationship("Case", back_populates="patient", cascade="all, delete-orphan")


class Scan(Base):
    __tablename__ = "scans"

    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id    = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    user_id       = Column(String, ForeignKey("users.id"), nullable=True)
    filename      = Column(String(255), nullable=False)
    file_path     = Column(String(500), nullable=False)
    image_url     = Column(String(500), nullable=True)
    status        = Column(String(30), default="completed")              # pending | analyzing | completed | failed
    is_archived   = Column(Boolean, default=False)
    created_at    = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    patient       = relationship("Patient", back_populates="scans")
    user          = relationship("User", back_populates="scans")
    analysis      = relationship("Analysis", back_populates="scan", uselist=False, cascade="all, delete-orphan")
    cases         = relationship("Case", back_populates="scan", cascade="all, delete-orphan")


class Analysis(Base):
    __tablename__ = "analyses"

    id                       = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id                  = Column(String, ForeignKey("scans.id"), nullable=False, unique=True, index=True)
    patient_id               = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    user_id                  = Column(String, ForeignKey("users.id"), nullable=True)
    
    # Classification results
    predicted_class          = Column(String(50), nullable=False)        # glioma | meningioma | notumor | pituitary
    tumor_type               = Column(String(100), nullable=False)       # Display name
    confidence               = Column(Float, nullable=False)
    uncertainty              = Column(Float, nullable=False)
    uncertainty_tier         = Column(String(20), nullable=False)        # LOW | MEDIUM | HIGH
    clinical_flag            = Column(String(255), nullable=True)
    entropy                  = Column(Float, nullable=True)
    
    # Risk Stratification
    risk_level               = Column(String(20), nullable=False)        # LOW | MEDIUM | HIGH
    risk_score               = Column(Float, nullable=False)
    risk_recommendation      = Column(Text, nullable=True)
    followup                 = Column(Text, nullable=True)
    
    # Segmentation
    segmentation_area_pixels = Column(Integer, default=0)
    segmentation_area_percent= Column(Float, default=0.0)
    mask_overlay_b64         = Column(Text, nullable=True)               # Base64 image
    
    # Explainable AI
    xai_gradcam_b64          = Column(Text, nullable=True)               # Base64 overlay
    xai_gradcam_plus_b64     = Column(Text, nullable=True)               # Base64 overlay
    xai_scorecam_b64         = Column(Text, nullable=True)               # Base64 overlay
    xai_integrated_gradients_b64 = Column(Text, nullable=True)          # Base64 overlay
    xai_faithfulness_json    = Column(Text, nullable=True)               # JSON: Pointing game + Pixel flipping
    
    # Distributions & Features
    class_probabilities_json = Column(Text, nullable=True)               # JSON dict
    std_probabilities_json   = Column(Text, nullable=True)               # JSON dict
    radiomics_features_json  = Column(Text, nullable=True)               # JSON list of top features
    
    # Clinical report
    clinical_report          = Column(Text, nullable=True)
    
    # Metadata
    model_variant            = Column(String(50), nullable=True)
    processing_time_ms       = Column(Integer, nullable=True)
    created_at               = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    scan                     = relationship("Scan", back_populates="analysis")


class Case(Base):
    __tablename__ = "cases"

    id                 = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_number        = Column(String(50), unique=True, nullable=False, index=True)  # e.g., "CASE-2026-001"
    patient_id         = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    scan_id            = Column(String, ForeignKey("scans.id"), nullable=False, index=True)
    analysis_id        = Column(String, ForeignKey("analyses.id"), nullable=True)
    assigned_doctor_id = Column(String, ForeignKey("users.id"), nullable=True)
    status             = Column(String(30), default="active", nullable=False)   # active | under_review | completed
    priority           = Column(String(20), default="medium", nullable=False)   # low | medium | high | urgent
    notes              = Column(Text, nullable=True)
    created_at         = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at         = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    patient            = relationship("Patient", back_populates="cases")
    scan               = relationship("Scan", back_populates="cases")
    assigned_doctor    = relationship("User", back_populates="cases")
    reports            = relationship("DiagnosticReport", back_populates="case", cascade="all, delete-orphan")


class DiagnosticReport(Base):
    __tablename__ = "diagnostic_reports"

    id             = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id        = Column(String, ForeignKey("cases.id"), nullable=True, index=True)
    scan_id        = Column(String, ForeignKey("scans.id"), nullable=False, index=True)
    patient_id     = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id      = Column(String, ForeignKey("users.id"), nullable=True)
    version        = Column(Integer, default=1, nullable=False)
    title          = Column(String(200), nullable=False)
    summary        = Column(Text, nullable=True)
    report_content = Column(Text, nullable=False)
    file_path      = Column(String(500), nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    case           = relationship("Case", back_populates="reports")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id       = Column(String, nullable=True, index=True)
    username      = Column(String(50), nullable=True, index=True)
    role          = Column(String(20), nullable=True)
    action        = Column(String(50), nullable=False, index=True)  # LOGIN | LOGOUT | UPLOAD_SCAN | RUN_PREDICTION | GENERATE_REPORT | CREATE_USER | UPDATE_USER | DEACTIVATE_USER | VIEW_CASE
    resource_type = Column(String(50), nullable=True)              # scan | analysis | case | report | user
    resource_id   = Column(String, nullable=True)
    details       = Column(Text, nullable=True)
    ip_address    = Column(String(50), nullable=True)
    user_agent    = Column(String(255), nullable=True)
    timestamp     = Column(DateTime, default=datetime.utcnow, index=True)


class Notification(Base):
    __tablename__ = "notifications"

    id          = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id     = Column(String, ForeignKey("users.id"), nullable=True, index=True)  # Targeted user or None for role broadcast
    target_role = Column(String(20), nullable=True, index=True)  # doctor | technician | admin | None (all)
    title       = Column(String(150), nullable=False)
    message     = Column(Text, nullable=False)
    type        = Column(String(30), default="info")             # info | success | warning | urgent
    link        = Column(String(255), nullable=True)
    is_read     = Column(Boolean, default=False, nullable=False, index=True)
    created_at  = Column(DateTime, default=datetime.utcnow, index=True)


class EmailOTP(Base):
    __tablename__ = "email_otps"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email      = Column(String(120), nullable=False, index=True)
    otp_hash   = Column(String(255), nullable=False)
    purpose    = Column(String(30), default="login")             # login | register | reset_password
    attempts   = Column(Integer, default=0, nullable=False)
    is_used    = Column(Boolean, default=False, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


def create_notification(
    db: Session,
    title: str,
    message: str,
    type: str = "info",
    target_role: Optional[str] = None,
    user_id: Optional[str] = None,
    link: Optional[str] = None,
) -> Notification:
    """Helper to dispatch in-app notifications to users or specific clinical roles."""
    try:
        notif = Notification(
            user_id=user_id,
            target_role=target_role,
            title=title,
            message=message,
            type=type,
            link=link,
            is_read=False,
            created_at=datetime.utcnow(),
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif
    except Exception as e:
        print(f"[Notification] Failed to create notification: {e}")
        db.rollback()
        return None



# ─── Initialization & Seeding ─────────────────────────────────────────────────

def create_tables():
    Base.metadata.create_all(bind=engine)
    _seed_default_users()


def _seed_default_users():
    """Seed initial Doctor, Technician, and Admin accounts if not present."""
    from auth import hash_password

    db: Session = SessionLocal()
    try:
        default_users = [
            {
                "username": "doctor",
                "email": "doctor@neuroscan.ai",
                "full_name": "Dr. Sarah Chen",
                "role": "doctor",
                "password": "doctor123",
                "title": "Lead Neuroradiologist",
                "avatar": "SC",
            },
            {
                "username": "tech",
                "email": "tech@neuroscan.ai",
                "full_name": "Alex Martinez",
                "role": "technician",
                "password": "tech123",
                "title": "Senior MRI Technologist",
                "avatar": "AM",
            },
            {
                "username": "admin",
                "email": "admin@neuroscan.ai",
                "full_name": "Prof. James Liu",
                "role": "admin",
                "password": "admin123",
                "title": "Chief Hospital Administrator",
                "avatar": "JL",
            },
        ]

        for u in default_users:
            existing = db.query(User).filter(User.username == u["username"]).first()
            if not existing:
                new_user = User(
                    username=u["username"],
                    email=u["email"],
                    full_name=u["full_name"],
                    role=u["role"],
                    password_hash=hash_password(u["password"]),
                    title=u["title"],
                    avatar=u["avatar"],
                    is_active=True,
                )
                db.add(new_user)
        db.commit()
    except Exception as e:
        print(f"[DB] Error seeding default users: {e}")
        db.rollback()
    finally:
        db.close()


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
