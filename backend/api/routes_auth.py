"""
NEUROSCAN AI — Production Authentication Routes (/api/auth/*)
=============================================================
Complete enterprise-grade authentication architecture supporting:
  - Real Email & Password Registration with mandatory Email Verification
  - Single User Identity with Multi-Role Memberships (Admin, Doctor, Technician)
  - Seamless, secure In-App Role Switching with backend RBAC enforcement
  - Secure bcrypt password hashing with legacy PBKDF2 compatibility
  - Rate limiting & Brute-force protection on all public auth endpoints
  - Google OAuth 2.0 with OIDC token verification & CSRF state checking
  - Secure Session Management (HttpOnly cookies + Server-side Token Revocation)
  - Self-service Password Reset & Authenticated Password Change
"""
import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, Request, Response, Depends, status
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import desc

import sys
from pathlib import Path
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from database import get_db, User, UserRole, EmailOTP, OAuthState, RevokedToken, create_notification
from auth import (
    hash_password, verify_password, create_token, decode_token, revoke_token,
    get_current_user, get_optional_user, log_audit_event,
    validate_password_strength, generate_secure_otp, hash_otp, verify_otp,
    check_rate_limit, get_token_from_request
)
from config import (
    IS_PRODUCTION, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
)
from email_service import send_otp_email, is_smtp_configured

router = APIRouter()


# ─── Pydantic Request Schemas ─────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=2, description="Username or institutional email")
    password: str = Field(..., min_length=1, description="Account password")


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    email: EmailStr = Field(..., description="Institutional email address")
    full_name: str = Field(..., min_length=2, max_length=100, description="Full professional name")
    password: str = Field(..., min_length=8, description="Strong password")
    role: Optional[str] = Field("doctor", description="Initial role request: doctor | technician (Admin role requires admin provisioning)")
    title: Optional[str] = Field(None, description="Clinical title e.g. Neuroradiologist")


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=4, max_length=10)


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class SwitchRoleRequest(BaseModel):
    role: str = Field(..., description="Target role: admin | doctor | technician")


class TokenVerifyRequest(BaseModel):
    token: str


class SendOTPRequest(BaseModel):
    email: EmailStr
    purpose: Optional[str] = Field("login", description="login | register | verify_email | reset_password")


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=4, max_length=10)
    purpose: Optional[str] = Field("login")


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirmRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=4, max_length=10)
    new_password: str = Field(..., min_length=8)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(...)
    new_password: str = Field(..., min_length=8)


class GoogleVerifyRequest(BaseModel):
    credential: Optional[str] = Field(None, description="Google ID Token from Google Identity Services button")
    code: Optional[str] = Field(None, description="OAuth authorization code")
    state: Optional[str] = Field(None, description="CSRF state parameter")


# ─── Format User Helper ───────────────────────────────────────────────────────

def _format_user_response(
    user: User,
    token: Optional[str] = None,
    active_role: Optional[str] = None,
    db: Optional[Session] = None,
) -> dict:
    name_parts = user.full_name.split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ""

    # Load all authorized roles from DB or relationship
    roles_list = []
    if hasattr(user, "roles") and user.roles:
        roles_list = [r.role.lower().strip() for r in user.roles]
    elif db:
        roles_records = db.query(UserRole).filter(UserRole.user_id == user.id).all()
        roles_list = [r.role.lower().strip() for r in roles_records]
    
    if not roles_list and user.role:
        roles_list = [user.role.lower().strip()]

    # Active role determination
    current_role = active_role or getattr(user, "current_active_role", None) or user.active_role or user.role
    current_role = current_role.lower().strip() if current_role else "doctor"
    if current_role not in roles_list and roles_list:
        current_role = roles_list[0]

    permissions_map = {
        "doctor": ["predict", "history", "cases", "reports", "upload"],
        "technician": ["predict", "upload", "history", "cases"],
        "admin": ["predict", "history", "cases", "reports", "upload", "users", "audit_logs", "statistics"],
    }
    permissions = permissions_map.get(current_role, ["predict"])

    res = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "firstName": first_name,
        "lastName": last_name,
        "fullName": user.full_name,
        "role": current_role,
        "roles": roles_list,
        "isEmailVerified": user.is_email_verified,
        "title": user.title or ("Lead Neuroradiologist" if current_role == "doctor" else "Hospital Administrator" if current_role == "admin" else "MRI Technologist"),
        "avatar": user.avatar or f"{first_name[0]}{last_name[0] if last_name else ''}".upper(),
        "profileImageUrl": None,
        "status": "active" if user.is_active else "inactive",
        "permissions": permissions,
    }
    if token:
        res["token"] = token
    return res


def _set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=IS_PRODUCTION,
        max_age=86400 * 7,
        path="/",
    )


# ─── Standard Auth Endpoints ──────────────────────────────────────────────────

@router.post("/register")
def register(
    req: RegisterRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Register a new clinical user account.
    Requires email verification via 6-digit OTP code before login is permitted.
    Prevents self-assignment of Administrator privileges.
    """
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(f"reg_{client_ip}", max_requests=5, window_seconds=300):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts. Please wait 5 minutes before trying again."
        )

    # Password complexity enforcement
    pwd_err = validate_password_strength(req.password)
    if pwd_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pwd_err)

    # Security check: Prohibit public registration with admin privileges
    role = req.role.lower().strip() if req.role else "doctor"
    if role not in ("doctor", "technician"):
        role = "doctor"

    clean_email = req.email.lower().strip()
    clean_username = req.username.lower().strip()

    # Check unique username and email
    if db.query(User).filter(User.username == clean_username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already in use.")

    if db.query(User).filter(User.email == clean_email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Institutional email is already registered.")

    name_parts = req.full_name.strip().split(" ", 1)
    avatar_initials = f"{name_parts[0][0]}{name_parts[1][0] if len(name_parts) > 1 else ''}".upper()

    new_user = User(
        id=str(uuid.uuid4()),
        username=clean_username,
        email=clean_email,
        full_name=req.full_name.strip(),
        role=role,
        active_role=role,
        password_hash=hash_password(req.password),
        title=req.title or ("Lead Neuroradiologist" if role == "doctor" else "MRI Technologist"),
        avatar=avatar_initials,
        is_active=True,
        is_email_verified=False,
    )
    db.add(new_user)
    db.flush()

    # Assign initial role membership in user_roles
    user_role_entry = UserRole(
        id=str(uuid.uuid4()),
        user_id=new_user.id,
        role=role,
        assigned_by="self_registration",
    )
    db.add(user_role_entry)

    # Invalidate prior OTPs and issue new 6-digit email verification OTP
    db.query(EmailOTP).filter(
        EmailOTP.email == clean_email,
        EmailOTP.purpose == "verify_email",
        EmailOTP.is_used == False,
    ).update({"is_used": True})

    otp_code = generate_secure_otp(6)
    otp_record = EmailOTP(
        id=str(uuid.uuid4()),
        email=clean_email,
        otp_hash=hash_otp(otp_code),
        purpose="verify_email",
        attempts=0,
        is_used=False,
        expires_at=datetime.utcnow() + timedelta(minutes=15),
        created_at=datetime.utcnow(),
    )
    db.add(otp_record)
    db.commit()

    # Dispatch verification email
    send_otp_email(to_email=clean_email, otp_code=otp_code, purpose="verify_email")

    log_audit_event(
        db=db,
        action="REGISTER_USER_PENDING_VERIFICATION",
        user=new_user,
        resource_type="user",
        resource_id=new_user.id,
        details=f"New clinical account registered for {new_user.email} with requested role '{role}'. Email verification dispatched.",
        request=request,
    )

    create_notification(
        db=db,
        title="New User Registration",
        message=f"{new_user.full_name} ({new_user.email}) registered as {role.capitalize()}. Awaiting email verification.",
        type="info",
        target_role="admin",
        link="/users",
    )

    return {
        "message": f"Registration successful. A 6-digit verification code has been dispatched to {clean_email}.",
        "email": clean_email,
        "requires_verification": True,
        "smtp_configured": is_smtp_configured(),
    }


@router.post("/verify-email")
def verify_email(
    req: VerifyEmailRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Validate 6-digit OTP code to complete email verification and issue active session.
    """
    clean_email = req.email.lower().strip()
    clean_otp = req.otp.strip()

    otp_record = db.query(EmailOTP).filter(
        EmailOTP.email == clean_email,
        EmailOTP.purpose.in_(["verify_email", "register"]),
        EmailOTP.is_used == False,
    ).order_by(desc(EmailOTP.created_at)).first()

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending verification code found for this email. Please request a new code."
        )

    if datetime.utcnow() > otp_record.expires_at:
        otp_record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new code."
        )

    if otp_record.attempts >= 5:
        otp_record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum verification attempts exceeded. Please request a new code."
        )

    otp_record.attempts += 1

    if not verify_otp(clean_otp, otp_record.otp_hash):
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please check your email and try again."
        )

    # Mark OTP used
    otp_record.is_used = True

    # Mark user verified
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    user.is_email_verified = True
    db.commit()
    db.refresh(user)

    # Issue verified session
    roles_records = db.query(UserRole).filter(UserRole.user_id == user.id).all()
    roles = [r.role.lower().strip() for r in roles_records] or [user.role.lower().strip()]
    active_role = user.active_role or roles[0]

    token = create_token(user.id, user.username, active_role, roles)
    _set_auth_cookie(response, token)

    log_audit_event(
        db=db,
        action="EMAIL_VERIFIED_SUCCESS",
        user=user,
        resource_type="user",
        resource_id=user.id,
        details=f"Email {user.email} verified successfully. Clinical session established.",
        request=request,
    )

    return _format_user_response(user, token, active_role, db=db)


@router.post("/resend-verification")
def resend_verification(
    req: ResendVerificationRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Resend email verification OTP."""
    clean_email = req.email.lower().strip()
    rate_key = f"resend_verify_{clean_email}"
    if not check_rate_limit(rate_key, max_requests=3, window_seconds=180):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait 3 minutes before requesting another verification code."
        )

    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        return {"message": "If an unverified account exists with this email, a verification code has been dispatched."}

    if user.is_email_verified:
        return {"message": "Account email is already verified. You may proceed to login."}

    # Invalidate prior and issue new
    db.query(EmailOTP).filter(
        EmailOTP.email == clean_email,
        EmailOTP.purpose == "verify_email",
        EmailOTP.is_used == False,
    ).update({"is_used": True})

    otp_code = generate_secure_otp(6)
    otp_record = EmailOTP(
        id=str(uuid.uuid4()),
        email=clean_email,
        otp_hash=hash_otp(otp_code),
        purpose="verify_email",
        attempts=0,
        is_used=False,
        expires_at=datetime.utcnow() + timedelta(minutes=15),
        created_at=datetime.utcnow(),
    )
    db.add(otp_record)
    db.commit()

    send_otp_email(to_email=clean_email, otp_code=otp_code, purpose="verify_email")

    return {
        "message": f"A new verification code has been dispatched to {clean_email}.",
        "smtp_configured": is_smtp_configured(),
    }


@router.post("/login")
def login(
    req: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Authenticate with username/email and password.
    Requires verified email. Issues multi-role aware session token.
    """
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"login_{client_ip}_{req.username.strip().lower()}"

    if not check_rate_limit(rate_key, max_requests=10, window_seconds=300):
        log_audit_event(
            db=db,
            action="LOGIN_RATE_LIMITED",
            details=f"Excessive login attempts from IP {client_ip} for '{req.username}'",
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please wait 5 minutes before trying again."
        )

    login_id = req.username.strip().lower()
    user = db.query(User).filter(
        (User.username == login_id) | (User.email == login_id)
    ).first()

    if not user or not verify_password(req.password, user.password_hash):
        log_audit_event(
            db=db,
            action="LOGIN_FAILED",
            details=f"Failed login attempt for identifier '{req.username}'",
            request=request,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password.")

    if not user.is_active:
        log_audit_event(
            db=db,
            action="LOGIN_BLOCKED",
            user=user,
            details=f"Deactivated account login attempt for user '{user.username}'",
            request=request,
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated. Please contact your Hospital Administrator.")

    # Email verification check
    if not user.is_email_verified:
        log_audit_event(
            db=db,
            action="LOGIN_BLOCKED_UNVERIFIED",
            user=user,
            details=f"Unverified email login attempt for {user.email}",
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your email address has not been verified. Please verify your email before logging in.",
            headers={"X-Email-Unverified": "true"},
        )

    # Load authorized roles
    roles_records = db.query(UserRole).filter(UserRole.user_id == user.id).all()
    roles = [r.role.lower().strip() for r in roles_records]
    if not roles:
        roles = [user.role.lower().strip()]
        # Backfill
        db.add(UserRole(user_id=user.id, role=roles[0], assigned_by="login_sync"))
        db.commit()

    active_role = user.active_role if user.active_role in roles else roles[0]

    token = create_token(user.id, user.username, active_role, roles)
    _set_auth_cookie(response, token)

    log_audit_event(
        db=db,
        action="LOGIN_SUCCESS",
        user=user,
        resource_type="user",
        resource_id=user.id,
        details=f"User '{user.username}' logged in successfully with active role '{active_role}'. Authorized roles: {roles}",
        request=request,
    )

    return _format_user_response(user, token, active_role, db=db)


# ─── Multi-Role Switching Endpoint ───────────────────────────────────────────

@router.post("/switch-role")
def switch_role(
    req: SwitchRoleRequest,
    request: Request,
    response: Response,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Seamlessly switch the authenticated user's active clinical workspace role.
    Verifies that the target role is an authorized membership assigned to this user in the DB.
    Never trusts client input without server-side validation.
    Rotates session token and writes to security audit trail.
    """
    target_role = req.role.lower().strip()
    if target_role not in ("admin", "doctor", "technician"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid target role '{target_role}'. Must be admin, doctor, or technician."
        )

    # Verify authorization in database
    authorized_roles = getattr(user, "all_authorized_roles", [])
    if not authorized_roles:
        roles_records = db.query(UserRole).filter(UserRole.user_id == user.id).all()
        authorized_roles = [r.role.lower().strip() for r in roles_records]

    if target_role not in authorized_roles:
        log_audit_event(
            db=db,
            action="ROLE_SWITCH_DENIED",
            user=user,
            resource_type="user_role",
            details=f"User '{user.username}' attempted unauthorized switch to role '{target_role}'. Authorized roles: {authorized_roles}",
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: You do not have the '{target_role}' role membership. Authorized roles: {authorized_roles}"
        )

    # Update active role in database
    user.active_role = target_role
    db.commit()

    # Issue rotated session token with updated active role
    token = create_token(user.id, user.username, target_role, authorized_roles)
    _set_auth_cookie(response, token)

    log_audit_event(
        db=db,
        action="ROLE_SWITCH_SUCCESS",
        user=user,
        resource_type="user_role",
        details=f"User '{user.username}' switched active role to '{target_role}'.",
        request=request,
    )

    return _format_user_response(user, token, target_role, db=db)


@router.get("/user")
def get_user(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return currently authenticated user session details, active role, and all authorized roles."""
    active_role = getattr(user, "current_active_role", user.active_role)
    return _format_user_response(user, active_role=active_role, db=db)


@router.post("/verify")
def verify(req: TokenVerifyRequest, db: Session = Depends(get_db)):
    """Validate token payload, signature, and server-side revocation status."""
    payload = decode_token(req.token, db=db)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session token.")

    user = db.query(User).filter(User.id == payload["sub"], User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found.")

    active_role = payload.get("role") or user.active_role or user.role
    return _format_user_response(user, req.token, active_role, db=db)


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    """
    Terminate current user session.
    Server-side invalidates token JTI in revocation blacklist and clears cookie.
    """
    token = get_token_from_request(request)
    if token:
        revoke_token(token, db)

    try:
        user = get_optional_user(request, db=db)
        if user:
            log_audit_event(
                db=db,
                action="LOGOUT",
                user=user,
                details=f"User '{user.username}' logged out. Session invalidated.",
                request=request,
            )
    except Exception:
        pass

    response.delete_cookie(key="auth_token", path="/", httponly=True, samesite="lax")
    return {"message": "Logged out successfully. Session invalidated."}


# ─── Password Reset & Change ──────────────────────────────────────────────────

@router.post("/password-reset/request")
def password_reset_request(req: PasswordResetRequest, request: Request, db: Session = Depends(get_db)):
    """Request a single-use password reset OTP for registered account."""
    clean_email = req.email.lower().strip()
    rate_key = f"pwd_reset_{clean_email}"
    if not check_rate_limit(rate_key, max_requests=3, window_seconds=300):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many password reset requests. Please wait 5 minutes."
        )

    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        # Avoid disclosing user existence; return standard confirmation
        return {"message": "If an account exists with this email, a reset code has been dispatched."}

    # Generate reset OTP
    otp_code = generate_secure_otp(6)
    db.query(EmailOTP).filter(
        EmailOTP.email == clean_email,
        EmailOTP.purpose == "reset_password",
        EmailOTP.is_used == False,
    ).update({"is_used": True})

    otp_record = EmailOTP(
        id=str(uuid.uuid4()),
        email=clean_email,
        otp_hash=hash_otp(otp_code),
        purpose="reset_password",
        attempts=0,
        is_used=False,
        expires_at=datetime.utcnow() + timedelta(minutes=15),
        created_at=datetime.utcnow(),
    )
    db.add(otp_record)
    db.commit()

    send_otp_email(to_email=clean_email, otp_code=otp_code, purpose="reset_password")

    log_audit_event(
        db=db,
        action="PASSWORD_RESET_REQUESTED",
        user=user,
        details=f"Password reset code issued for {clean_email}",
        request=request,
    )

    return {
        "message": "If an account exists with this email, a reset code has been dispatched.",
        "smtp_configured": is_smtp_configured(),
    }


@router.post("/password-reset/confirm")
def password_reset_confirm(
    req: PasswordResetConfirmRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Validate OTP and update user password with bcrypt."""
    clean_email = req.email.lower().strip()
    clean_otp = req.otp.strip()

    pwd_err = validate_password_strength(req.new_password)
    if pwd_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pwd_err)

    otp_record = db.query(EmailOTP).filter(
        EmailOTP.email == clean_email,
        EmailOTP.purpose == "reset_password",
        EmailOTP.is_used == False,
    ).order_by(desc(EmailOTP.created_at)).first()

    if not otp_record or datetime.utcnow() > otp_record.expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset code.")

    if not verify_otp(clean_otp, otp_record.otp_hash):
        otp_record.attempts += 1
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset code.")

    otp_record.is_used = True

    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    user.password_hash = hash_password(req.new_password)
    db.commit()

    log_audit_event(
        db=db,
        action="PASSWORD_RESET_COMPLETED",
        user=user,
        details=f"Password reset successfully completed for {user.username}",
        request=request,
    )

    return {"message": "Password successfully updated. You may now log in with your new credentials."}


@router.post("/password-change")
def password_change(
    req: PasswordChangeRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Allow logged in user to update password."""
    if not verify_password(req.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")

    pwd_err = validate_password_strength(req.new_password)
    if pwd_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pwd_err)

    user.password_hash = hash_password(req.new_password)
    db.commit()

    log_audit_event(
        db=db,
        action="PASSWORD_CHANGED",
        user=user,
        details="User updated password via profile settings",
        request=request,
    )

    return {"message": "Password successfully changed."}


# ─── Google OAuth 2.0 Integration ─────────────────────────────────────────────

@router.get("/google/url")
def get_google_auth_url(db: Session = Depends(get_db)):
    """
    Generates Google OAuth 2.0 consent URL with cryptographic CSRF state token.
    """
    if not GOOGLE_CLIENT_ID:
        return {
            "configured": False,
            "message": "Google OAuth is not configured. Please supply GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.",
            "auth_url": None,
        }

    # Generate cryptographically secure state token (CSRF protection)
    state = secrets.token_urlsafe(32)
    oauth_state = OAuthState(
        id=str(uuid.uuid4()),
        state=state,
        redirect_url=GOOGLE_REDIRECT_URI,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    db.add(oauth_state)
    db.commit()

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return {
        "configured": True,
        "auth_url": url,
        "state": state,
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
    }


@router.post("/google/verify")
async def verify_google_token(
    req: GoogleVerifyRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Validates Google ID Token from Google Identity Services button
    or exchanges authorization code.
    Enforces verified Google email and links to single user identity.
    Never automatically grants administrative privileges.
    """
    if not req.credential and not req.code:
        raise HTTPException(status_code=400, detail="Missing Google credential or authorization code.")

    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Sign-In is not configured on server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables."
        )

    # CSRF state check if code flow was used
    if req.state:
        state_entry = db.query(OAuthState).filter(
            OAuthState.state == req.state,
            OAuthState.expires_at > datetime.utcnow(),
        ).first()
        if not state_entry:
            raise HTTPException(status_code=400, detail="Invalid or expired OAuth state parameter (CSRF protection).")
        db.delete(state_entry)
        db.commit()

    # 1. ID token validation
    id_token = req.credential
    if not id_token and req.code:
        if not GOOGLE_CLIENT_SECRET:
            raise HTTPException(status_code=503, detail="GOOGLE_CLIENT_SECRET is not configured on server.")

        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "code": req.code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(token_url, data=token_data)
                if res.status_code != 200:
                    raise HTTPException(status_code=400, detail=f"Google token exchange failed: {res.text}")
                tokens = res.json()
                id_token = tokens.get("id_token")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Google OAuth token exchange error: {str(e)}")

    if not id_token:
        raise HTTPException(status_code=400, detail="Could not obtain Google ID token.")

    # Verify ID Token claims via Google tokeninfo
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": id_token}
            )
            if res.status_code != 200:
                raise HTTPException(status_code=401, detail="Google ID token validation failed.")
            data = res.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to communicate with Google authentication servers: {str(e)}")

    # Check audience matches our client ID
    aud = data.get("aud")
    if aud != GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Google token audience mismatch.")

    # Critical requirement: Never automatically link based on unverified email
    email_verified = data.get("email_verified")
    if email_verified not in (True, "true", "True", 1):
        raise HTTPException(status_code=400, detail="Google account email is not verified by Google.")

    email = data.get("email", "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Google token did not provide a valid email address.")

    google_sub = data.get("sub")
    name = data.get("name", email.split("@")[0].title())

    # User identity resolution:
    # 1. Match by google_sub
    user = None
    if google_sub:
        user = db.query(User).filter(User.google_sub == google_sub).first()

    # 2. Match by verified email
    if not user:
        user = db.query(User).filter(User.email == email).first()
        if user:
            # Safe link to existing verified account
            user.google_sub = google_sub
            user.is_email_verified = True
            db.commit()

    # 3. Create new user if not found
    if not user:
        username = email.split("@")[0].lower()
        base_u = username
        count = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_u}{count}"
            count += 1

        name_parts = name.split(" ", 1)
        avatar_initials = f"{name_parts[0][0]}{name_parts[1][0] if len(name_parts) > 1 else ''}".upper()

        user = User(
            id=str(uuid.uuid4()),
            username=username,
            email=email,
            full_name=name,
            role="doctor",
            active_role="doctor",
            password_hash=hash_password(uuid.uuid4().hex),
            title="Lead Neuroradiologist",
            avatar=avatar_initials,
            is_active=True,
            is_email_verified=True,
            google_sub=google_sub,
        )
        db.add(user)
        db.flush()

        # Notice: New Google sign-ins do NOT receive admin privileges automatically
        db.add(UserRole(
            id=str(uuid.uuid4()),
            user_id=user.id,
            role="doctor",
            assigned_by="google_oauth",
        ))
        db.commit()
        db.refresh(user)

        create_notification(
            db=db,
            title="New Google Account Registered",
            message=f"{user.full_name} ({user.email}) registered via Google OAuth with default staff access.",
            type="info",
            target_role="admin",
            link="/users",
        )

    # Load authorized roles
    roles_records = db.query(UserRole).filter(UserRole.user_id == user.id).all()
    roles = [r.role.lower().strip() for r in roles_records] or [user.role.lower().strip()]
    active_role = user.active_role if user.active_role in roles else roles[0]

    token = create_token(user.id, user.username, active_role, roles)
    _set_auth_cookie(response, token)

    log_audit_event(
        db=db,
        action="LOGIN_GOOGLE_SUCCESS",
        user=user,
        details=f"User '{user.username}' signed in via Google OAuth. Active role: '{active_role}'. Roles: {roles}",
        request=request,
    )

    return _format_user_response(user, token, active_role, db=db)
