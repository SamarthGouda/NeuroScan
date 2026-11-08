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
    Column, String, Float, Integer, Boolean, Text, DateTime, ForeignKey, create_engine, desc, text, UniqueConstraint
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

    id                          = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username                    = Column(String(50), unique=True, nullable=False, index=True)
    email                       = Column(String(120), unique=True, nullable=False, index=True)
    full_name                   = Column(String(100), nullable=False)
    role                        = Column(String(20), nullable=False, default="doctor")   # Primary / default role
    password_hash               = Column(String(255), nullable=False)
    title                       = Column(String(100), nullable=True)                    # e.g., "Senior Neuroradiologist"
    avatar                      = Column(String(10), nullable=True)                     # Initials, e.g., "SC"
    is_active                   = Column(Boolean, default=True, nullable=False)
    is_email_verified           = Column(Boolean, default=False, nullable=False)
    google_sub                  = Column(String(100), nullable=True, unique=True, index=True)
    email_verification_token    = Column(String(255), nullable=True)
    email_verification_expires_at = Column(DateTime, nullable=True)
    active_role                 = Column(String(20), nullable=True)
    created_at                  = Column(DateTime, default=datetime.utcnow)

    # Relationships
    roles                       = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    scans                       = relationship("Scan", back_populates="user")
    cases                       = relationship("Case", back_populates="assigned_doctor")


class UserRole(Base):
    """Multiple authorized role memberships linked to a single verified user identity."""
    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint("user_id", "role", name="uq_user_role"),)

    id          = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id     = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role        = Column(String(20), nullable=False, index=True)   # admin | doctor | technician
    assigned_at = Column(DateTime, default=datetime.utcnow)
    assigned_by = Column(String, nullable=True)

    # Relationships
    user        = relationship("User", back_populates="roles")


class RevokedToken(Base):
    """Server-side session invalidation / token revocation blacklist."""
    __tablename__ = "revoked_tokens"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    token_jti  = Column(String(64), unique=True, index=True, nullable=False)
    revoked_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False, index=True)


class OAuthState(Base):
    """CSRF state verification store for OAuth 2.0 flows."""
    __tablename__ = "oauth_states"

    id           = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    state        = Column(String(128), unique=True, index=True, nullable=False)
    redirect_url = Column(String(255), nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow)
    expires_at   = Column(DateTime, nullable=False, index=True)


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



# ─── Initialization & Schema Migration ────────────────────────────────────────

def create_tables():
    """
    Creates all application tables and runs backward-compatible schema migrations:
    - Adds new security & multi-role columns to `users` if missing
    - Creates `user_roles`, `revoked_tokens`, `oauth_states`
    - Populates `user_roles` for existing users
    - Strict removal of all hardcoded demo credentials
    """
    Base.metadata.create_all(bind=engine)
    _migrate_schema()


def _migrate_schema():
    """Ensure backward-compatible schema migration without data loss."""
    with engine.connect() as conn:
        is_sqlite = engine.dialect.name == "sqlite"
        if is_sqlite:
            res = conn.execute(text("PRAGMA table_info(users)"))
            existing_cols = {row[1] for row in res.fetchall()}

            new_columns = [
                ("is_email_verified", "BOOLEAN DEFAULT 0 NOT NULL"),
                ("google_sub", "VARCHAR(100)"),
                ("email_verification_token", "VARCHAR(255)"),
                ("email_verification_expires_at", "DATETIME"),
                ("active_role", "VARCHAR(20)"),
            ]
            for col_name, col_type in new_columns:
                if col_name not in existing_cols:
                    try:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                        print(f"[DB Migration] Added column '{col_name}' to users table.")
                    except Exception as e:
                        print(f"[DB Migration] Notice on column '{col_name}': {e}")
            conn.commit()

    # Populate user_roles for any existing users that lack them
    db: Session = SessionLocal()
    try:
        users = db.query(User).all()
        for u in users:
            # Existing legacy records are marked verified so existing scans/patients aren't locked out
            if not u.is_email_verified:
                u.is_email_verified = True

            existing_roles = db.query(UserRole).filter(UserRole.user_id == u.id).all()
            if not existing_roles and u.role:
                new_ur = UserRole(
                    user_id=u.id,
                    role=u.role.lower().strip(),
                    assigned_by="system_migration",
                )
                db.add(new_ur)
                if not u.active_role:
                    u.active_role = u.role.lower().strip()
        db.commit()
    except Exception as e:
        print(f"[DB Migration] Error backfilling user_roles: {e}")
        db.rollback()
    finally:
        db.close()


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
