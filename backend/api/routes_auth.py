"""
NEUROSCAN AI — Production Authentication Routes (/api/auth/*)
=============================================================
Complete authentication architecture supporting:
  - Email/Username + Password Login & Registration
  - Rate limiting & Brute Force Protection
  - Email OTP generation, dispatch & verification
  - Password Reset & Authenticated Password Change
  - Google OAuth 2.0 verification & auto-linking
  - Session verification & Logout
"""
import uuid
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, Request, Response, Depends, status
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db, User, EmailOTP, create_notification
from auth import (
    hash_password, verify_password, create_token, decode_token,
    get_current_user, get_optional_user, log_audit_event,
    validate_password_strength, generate_secure_otp, hash_otp, verify_otp,
    check_rate_limit
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
    role: Optional[str] = Field("doctor", description="Role: doctor | technician")
    title: Optional[str] = Field(None, description="Clinical title e.g. Neuroradiologist")


class TokenVerifyRequest(BaseModel):
    token: str


class SendOTPRequest(BaseModel):
    email: EmailStr
    purpose: Optional[str] = Field("login", description="login | register | reset_password")


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
    credential: Optional[str] = Field(None, description="Google ID Token from Google Identity Services")
    code: Optional[str] = Field(None, description="OAuth authorization code")


# ─── Format User Helper ───────────────────────────────────────────────────────

def _format_user_response(user: User, token: Optional[str] = None) -> dict:
    name_parts = user.full_name.split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ""

    permissions = {
        "doctor": ["predict", "history", "cases", "reports", "upload"],
        "technician": ["predict", "upload", "history"],
        "admin": ["predict", "history", "cases", "reports", "upload", "users", "audit_logs", "statistics"],
    }.get(user.role, ["predict"])

    res = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "firstName": first_name,
        "lastName": last_name,
        "fullName": user.full_name,
        "role": user.role,
        "title": user.title or ("Doctor" if user.role == "doctor" else user.role.capitalize()),
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
    """Register a new clinical user account."""
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(f"reg_{client_ip}", max_requests=5, window_seconds=300):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts. Please wait 5 minutes."
        )

    # Validate password complexity
    pwd_err = validate_password_strength(req.password)
    if pwd_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pwd_err)

    # Validate role
    role = req.role.lower().strip() if req.role else "doctor"
    if role not in ("doctor", "technician", "admin"):
        role = "doctor"

    clean_email = req.email.lower().strip()
    clean_username = req.username.lower().strip()

    # Check unique username and email
    if db.query(User).filter(User.username == clean_username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already in use.")

    if db.query(User).filter(User.email == clean_email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Institutional email already registered.")

    name_parts = req.full_name.strip().split(" ", 1)
    avatar_initials = f"{name_parts[0][0]}{name_parts[1][0] if len(name_parts) > 1 else ''}".upper()

    new_user = User(
        id=str(uuid.uuid4()),
        username=clean_username,
        email=clean_email,
        full_name=req.full_name.strip(),
        role=role,
        password_hash=hash_password(req.password),
        title=req.title or ("Lead Neuroradiologist" if role == "doctor" else "MRI Technologist"),
        avatar=avatar_initials,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_token(new_user.id, new_user.username, new_user.role)
    _set_auth_cookie(response, token)

    log_audit_event(
        db=db,
        action="REGISTER_USER",
        user=new_user,
        resource_type="user",
        resource_id=new_user.id,
        details=f"New {role} account registered: {new_user.username} ({new_user.email})",
        request=request,
    )

    create_notification(
        db=db,
        title="New User Registered",
        message=f"{new_user.full_name} ({new_user.role.capitalize()}) has registered for clinical access.",
        type="info",
        target_role="admin",
        link="/users",
    )

    return _format_user_response(new_user, token)


@router.post("/login")
def login(
    req: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Authenticate with username/email and password."""
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"login_{client_ip}_{req.username.strip().lower()}"

    if not check_rate_limit(rate_key, max_requests=10, window_seconds=300):
        log_audit_event(
            db=db,
            action="LOGIN_RATE_LIMITED",
            details=f"Excessive login attempts from IP {client_ip} for username '{req.username}'",
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
            details=f"Failed login attempt for username/email '{req.username}'",
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
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated. Contact Administrator.")

    token = create_token(user.id, user.username, user.role)
    _set_auth_cookie(response, token)

    log_audit_event(
        db=db,
        action="LOGIN_SUCCESS",
        user=user,
        resource_type="user",
        resource_id=user.id,
        details=f"User '{user.username}' logged in successfully as {user.role}",
        request=request,
    )

    return _format_user_response(user, token)


@router.get("/user")
def get_user(request: Request, user: User = Depends(get_current_user)):
    """Return currently authenticated user session details."""
    return _format_user_response(user)


@router.post("/verify")
def verify(req: TokenVerifyRequest, db: Session = Depends(get_db)):
    """Validate token payload and signature."""
    payload = decode_token(req.token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")

    user = db.query(User).filter(User.id == payload["sub"], User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found.")

    return _format_user_response(user, req.token)


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    """Terminate current user session."""
    try:
        user = get_optional_user(request, db=db)
        if user:
            log_audit_event(
                db=db,
                action="LOGOUT",
                user=user,
                details=f"User '{user.username}' logged out",
                request=request,
            )
    except Exception:
        pass
    response.delete_cookie(key="auth_token", path="/", httponly=True, samesite="lax")
    return {"message": "Logged out successfully."}


# ─── OTP Authentication Endpoints ─────────────────────────────────────────────

@router.post("/otp/send")
def send_otp(req: SendOTPRequest, request: Request, db: Session = Depends(get_db)):
    """Generate and dispatch a 6-digit OTP code to the provided email."""
    email = req.email.lower().strip()
    rate_key = f"otp_send_{email}"

    if not check_rate_limit(rate_key, max_requests=3, window_seconds=180):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait 3 minutes before requesting another verification code."
        )

    # Invalidate any unused prior OTPs for this email and purpose
    db.query(EmailOTP).filter(
        EmailOTP.email == email,
        EmailOTP.purpose == req.purpose,
        EmailOTP.is_used == False,
    ).update({"is_used": True})

    otp_code = generate_secure_otp(6)
    hashed = hash_otp(otp_code)
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    otp_record = EmailOTP(
        id=str(uuid.uuid4()),
        email=email,
        otp_hash=hashed,
        purpose=req.purpose or "login",
        attempts=0,
        is_used=False,
        expires_at=expires_at,
        created_at=datetime.utcnow(),
    )
    db.add(otp_record)
    db.commit()

    # Dispatch via Email Service
    send_otp_email(to_email=email, otp_code=otp_code, purpose=req.purpose or "login")

    log_audit_event(
        db=db,
        action="OTP_DISPATCHED",
        details=f"Verification OTP requested for {email} (purpose: {req.purpose})",
        request=request,
    )

    return {
        "message": f"Verification code sent to {email}. Valid for 10 minutes.",
        "email": email,
        "purpose": req.purpose,
        "smtp_configured": is_smtp_configured(),
    }


@router.post("/otp/verify")
def verify_otp_endpoint(
    req: VerifyOTPRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Verify an OTP code and issue a full clinical session token."""
    email = req.email.lower().strip()
    clean_otp = req.otp.strip()

    otp_record = db.query(EmailOTP).filter(
        EmailOTP.email == email,
        EmailOTP.purpose == req.purpose,
        EmailOTP.is_used == False,
    ).order_by(desc(EmailOTP.created_at)).first()

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active verification code found. Please request a new code."
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
            detail="Invalid verification code. Please check and try again."
        )

    # Mark OTP as successfully used
    otp_record.is_used = True
    db.commit()

    # Find or auto-provision user if logging in via OTP
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Create user with doctor role by default
        base_name = email.split("@")[0].replace(".", " ").title()
        user = User(
            id=str(uuid.uuid4()),
            username=email.split("@")[0].lower(),
            email=email,
            full_name=base_name or "Verified Physician",
            role="doctor",
            password_hash=hash_password(uuid.uuid4().hex),
            title="Attending Neuroradiologist",
            avatar="MD",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_token(user.id, user.username, user.role)
    _set_auth_cookie(response, token)

    log_audit_event(
        db=db,
        action="LOGIN_OTP_SUCCESS",
        user=user,
        details=f"User '{user.username}' authenticated via email OTP",
        request=request,
    )

    return _format_user_response(user, token)


# ─── Password Reset & Change ──────────────────────────────────────────────────

@router.post("/password-reset/request")
def password_reset_request(req: PasswordResetRequest, request: Request, db: Session = Depends(get_db)):
    """Request a password reset OTP for registered account."""
    email = req.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # For security, avoid disclosing user existence; return standard confirmation
        return {"message": "If an account exists with this email, a reset code has been dispatched."}

    # Generate reset OTP
    otp_code = generate_secure_otp(6)
    hashed = hash_otp(otp_code)
    expires_at = datetime.utcnow() + timedelta(minutes=15)

    otp_record = EmailOTP(
        id=str(uuid.uuid4()),
        email=email,
        otp_hash=hashed,
        purpose="reset_password",
        attempts=0,
        is_used=False,
        expires_at=expires_at,
        created_at=datetime.utcnow(),
    )
    db.add(otp_record)
    db.commit()

    send_otp_email(to_email=email, otp_code=otp_code, purpose="reset_password")

    log_audit_event(
        db=db,
        action="PASSWORD_RESET_REQUESTED",
        user=user,
        details=f"Password reset code issued for {email}",
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
    """Validate OTP and update user password."""
    email = req.email.lower().strip()
    clean_otp = req.otp.strip()

    pwd_err = validate_password_strength(req.new_password)
    if pwd_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pwd_err)

    otp_record = db.query(EmailOTP).filter(
        EmailOTP.email == email,
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

    user = db.query(User).filter(User.email == email).first()
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
def get_google_auth_url():
    """
    Returns the Google OAuth 2.0 consent screen URL or indicates
    that Google OAuth credentials need to be configured in .env.
    """
    if not GOOGLE_CLIENT_ID:
        return {
            "configured": False,
            "message": "Google OAuth is not configured on this server. Please supply GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables.",
            "auth_url": None,
        }

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return {
        "configured": True,
        "auth_url": url,
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
    Validates Google ID Token from frontend Google Identity Services button
    or authorization code and signs in / provisions the user.
    """
    if not req.credential and not req.code:
        raise HTTPException(status_code=400, detail="Missing Google authorization credential or code.")

    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Sign-In is not yet configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server environment variables."
        )

    # 1. If ID token (credential) passed directly from frontend button
    if req.credential:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(
                    "https://oauth2.googleapis.com/tokeninfo",
                    params={"id_token": req.credential}
                )
                if res.status_code != 200:
                    raise HTTPException(status_code=401, detail="Google token verification failed.")
                data = res.json()
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to communicate with Google authentication servers: {str(e)}")

        email = data.get("email", "").lower().strip()
        if not email:
            raise HTTPException(status_code=400, detail="Google token did not provide an email address.")

        name = data.get("name", email.split("@")[0].title())
        picture = data.get("picture")

        # Find or create user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            username = email.split("@")[0].lower()
            # Ensure unique username
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
                password_hash=hash_password(uuid.uuid4().hex),
                title="Lead Neuroradiologist",
                avatar=avatar_initials,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            create_notification(
                db=db,
                title="New Google User Connected",
                message=f"{user.full_name} ({user.email}) signed in via Google OAuth.",
                type="info",
                target_role="admin",
                link="/users",
            )

        token = create_token(user.id, user.username, user.role)
        _set_auth_cookie(response, token)

        log_audit_event(
            db=db,
            action="LOGIN_GOOGLE_SUCCESS",
            user=user,
            details=f"User '{user.username}' signed in via Google Identity Services",
            request=request,
        )

        return _format_user_response(user, token)

    # 2. Authorization code exchange
    if req.code:
        if not GOOGLE_CLIENT_SECRET:
            raise HTTPException(status_code=503, detail="GOOGLE_CLIENT_SECRET is not configured on server.")

        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "code": req.code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(token_url, data=data)
                if res.status_code != 200:
                    raise HTTPException(status_code=400, detail="Google token exchange failed.")
                tokens = res.json()
                id_token = tokens.get("id_token")
                # Recursive call with verified id_token
                return await verify_google_token(
                    GoogleVerifyRequest(credential=id_token), request, response, db
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Google OAuth token exchange error: {str(e)}")
