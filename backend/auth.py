"""
NEUROSCAN AI — Authentication, Hashing & Authorization Module
=============================================================
Provides:
  - Secure bcrypt password hashing & verification (with legacy PBKDF2 fallback)
  - Signed session token issuance, rotation & server-side revocation
  - Role-based authorization dependencies for FastAPI with multi-role enforcement
  - Audit logging helper
"""
import base64
import hashlib
import hmac
import os
import time
import json
import uuid
from typing import Optional, List
from datetime import datetime, timezone

from fastapi import Request, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from database import get_db, User, UserRole, RevokedToken, AuditLog

from config import AUTH_SECRET, TOKEN_EXPIRY_SECONDS, IS_PRODUCTION

security_bearer = HTTPBearer(auto_error=False)

# In-memory sliding window rate limiter: {key: [timestamp, timestamp, ...]}
_RATE_LIMIT_STORE: dict[str, list[float]] = {}


def check_rate_limit(key: str, max_requests: int = 5, window_seconds: int = 300) -> bool:
    """
    Returns True if request is allowed, False if rate limited.
    Cleans up timestamps older than window_seconds.
    """
    now = time.time()
    timestamps = _RATE_LIMIT_STORE.get(key, [])
    # Filter only timestamps within window
    timestamps = [t for t in timestamps if now - t < window_seconds]
    if len(timestamps) >= max_requests:
        _RATE_LIMIT_STORE[key] = timestamps
        return False
    timestamps.append(now)
    _RATE_LIMIT_STORE[key] = timestamps
    return True


# ─── Password Strength & Hashing ──────────────────────────────────────────────

def validate_password_strength(password: str) -> Optional[str]:
    """
    Enforces production password standards:
    - Minimum 8 characters
    - At least one letter
    - At least one digit
    """
    if len(password) < 8:
        return "Password must be at least 8 characters long."
    if not any(c.isalpha() for c in password):
        return "Password must contain at least one letter."
    if not any(c.isdigit() for c in password):
        return "Password must contain at least one number."
    return None


def hash_password(password: str) -> str:
    """Hash password using industry-standard bcrypt with 12 salt rounds."""
    try:
        import bcrypt
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(12)).decode("utf-8")
    except Exception:
        # Fallback to PBKDF2 if bcrypt is not available in environment
        salt = os.urandom(16)
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
        return f"{base64.b64encode(salt).decode()}:{base64.b64encode(key).decode()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt or stored PBKDF2 hash with constant-time comparison."""
    if not plain_password or not hashed_password:
        return False
    try:
        # 1. Bcrypt hash check ($2b$, $2a$, $2y$)
        if hashed_password.startswith(("$2b$", "$2a$", "$2y$")):
            import bcrypt
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

        # 2. PBKDF2 format check
        if ":" in hashed_password:
            salt_str, key_str = hashed_password.split(":", 1)
            salt = base64.b64decode(salt_str.encode())
            expected_key = base64.b64decode(key_str.encode())
            key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100_000)
            return hmac.compare_digest(key, expected_key)

        return plain_password == hashed_password
    except Exception:
        return False


# ─── OTP Utilities ────────────────────────────────────────────────────────────

def generate_secure_otp(length: int = 6) -> str:
    """Cryptographically secure numeric OTP."""
    import secrets
    return "".join(secrets.choice("0123456789") for _ in range(length))


def hash_otp(otp: str) -> str:
    """Hash OTP using SHA-256 with server auth secret salt."""
    salted = f"{AUTH_SECRET}:{otp}"
    return hashlib.sha256(salted.encode()).hexdigest()


def verify_otp(plain_otp: str, hashed_otp: str) -> bool:
    """Timing-attack-safe OTP verification."""
    expected = hash_otp(plain_otp)
    return hmac.compare_digest(expected, hashed_otp)


# ─── Token Generation & Verification ──────────────────────────────────────────

def create_token(user_id: str, username: str, role: str, authorized_roles: Optional[List[str]] = None) -> str:
    """Create a tamper-proof base64url signed token with active role and authorized roles list."""
    if authorized_roles is None:
        authorized_roles = [role]
    now = int(time.time())
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "roles": authorized_roles,
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + TOKEN_EXPIRY_SECONDS,
    }
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    signature = hmac.new(AUTH_SECRET.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"


def decode_token(token: str, db: Optional[Session] = None) -> Optional[dict]:
    """Validate signature, expiration, and database revocation of a signed session token."""
    try:
        if not token or "." not in token:
            return None
        payload_b64, signature = token.split(".", 1)
        expected_sig = hmac.new(AUTH_SECRET.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        payload_json = base64.urlsafe_b64decode(payload_b64.encode()).decode()
        payload = json.loads(payload_json)
        if time.time() > payload.get("exp", 0):
            return None

        # Check server-side revocation blacklist if DB is supplied
        if db is not None and "jti" in payload:
            jti = payload["jti"]
            revoked = db.query(RevokedToken).filter(RevokedToken.token_jti == jti).first()
            if revoked:
                return None

        return payload
    except Exception:
        return None


def revoke_token(token: str, db: Session):
    """Store token JTI into database blacklist for immediate server-side invalidation."""
    try:
        payload = decode_token(token)
        if payload and "jti" in payload:
            jti = payload["jti"]
            exp_ts = payload.get("exp", int(time.time()) + TOKEN_EXPIRY_SECONDS)
            exp_dt = datetime.fromtimestamp(exp_ts, tz=timezone.utc).replace(tzinfo=None)
            revoked_entry = RevokedToken(
                token_jti=jti,
                expires_at=exp_dt,
            )
            db.add(revoked_entry)
            db.commit()
    except Exception as e:
        print(f"[Auth] Error revoking token: {e}")
        db.rollback()


# ─── Request Context & Dependencies ──────────────────────────────────────────

def get_token_from_request(request: Request, bearer: Optional[HTTPAuthorizationCredentials] = None) -> Optional[str]:
    """Extract auth token from HTTP cookie or Authorization header."""
    # 1. Bearer header
    if bearer and bearer.credentials:
        return bearer.credentials
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    # 2. Cookie
    return request.cookies.get("auth_token")


def get_current_user(
    request: Request,
    bearer: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency: authenticates user, verifies email status,
    loads multi-role memberships, and attaches current active role.
    """
    token = get_token_from_request(request, bearer)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(token, db=db)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == payload["sub"], User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account deactivated.",
        )

    # Email verification gate
    if not user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email address not verified. Please verify your email before accessing clinical features.",
        )

    # Load authorized roles from user_roles table
    roles_records = db.query(UserRole).filter(UserRole.user_id == user.id).all()
    authorized_roles = [r.role.lower().strip() for r in roles_records]
    if not authorized_roles:
        # Fallback to single primary role if legacy
        authorized_roles = [user.role.lower().strip()]

    # Active role determination: from token or user's active_role
    active_role = payload.get("role") or user.active_role or user.role
    active_role = active_role.lower().strip()

    # Verify that the active role in session is genuinely among user's authorized role memberships
    if active_role not in authorized_roles:
        # If active role is not authorized, fallback to first authorized role or forbid
        if authorized_roles:
            active_role = authorized_roles[0]
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User has no authorized role memberships.",
            )

    # Attach dynamic properties to user instance for request lifetime
    setattr(user, "current_active_role", active_role)
    setattr(user, "all_authorized_roles", authorized_roles)

    return user


def get_optional_user(
    request: Request,
    bearer: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """FastAPI dependency: returns current User if authenticated & verified, else None."""
    token = get_token_from_request(request, bearer)
    if not token:
        return None
    payload = decode_token(token, db=db)
    if not payload or "sub" not in payload:
        return None
    user = db.query(User).filter(User.id == payload["sub"], User.is_active == True).first()
    if not user or not user.is_email_verified:
        return None

    roles_records = db.query(UserRole).filter(UserRole.user_id == user.id).all()
    authorized_roles = [r.role.lower().strip() for r in roles_records] or [user.role.lower().strip()]
    active_role = (payload.get("role") or user.active_role or user.role).lower().strip()
    if active_role not in authorized_roles and authorized_roles:
        active_role = authorized_roles[0]

    setattr(user, "current_active_role", active_role)
    setattr(user, "all_authorized_roles", authorized_roles)
    return user


def require_role(allowed_roles: List[str]):
    """Decorator dependency factory enforcing active role permissions against assigned user_roles."""
    allowed = [r.lower().strip() for r in allowed_roles]

    def role_checker(user: User = Depends(get_current_user)) -> User:
        active_role = getattr(user, "current_active_role", user.role)
        if active_role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: Active role '{active_role}' lacks permission. Required: {allowed_roles}",
            )
        return user
    return role_checker


# ─── Audit Logging Helper ─────────────────────────────────────────────────────

def log_audit_event(
    db: Session,
    action: str,
    user: Optional[User] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[str] = None,
    request: Optional[Request] = None,
):
    """Record an audit trail event into the audit_logs table."""
    try:
        ip = None
        ua = None
        if request:
            ip = request.client.host if request.client else None
            ua = request.headers.get("user-agent", "")[:250]

        active_role = getattr(user, "current_active_role", user.role if user else None)

        log_entry = AuditLog(
            user_id=user.id if user else None,
            username=user.username if user else "anonymous",
            role=active_role,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            details=details,
            ip_address=ip,
            user_agent=ua,
            timestamp=datetime.utcnow(),
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        print(f"[AuditLog] Failed to record event: {e}")
