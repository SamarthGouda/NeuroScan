"""
NEUROSCAN AI — Authentication, Hashing & Authorization Module
=============================================================
Provides:
  - Secure PBKDF2 password hashing & verification
  - Signed session token issuance & verification
  - Role-based authorization dependencies for FastAPI
  - Audit logging helper
"""
import base64
import hashlib
import hmac
import os
import time
import json
from typing import Optional, List
from datetime import datetime

from fastapi import Request, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from database import get_db, User, AuditLog

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
    """Hash password using PBKDF2-HMAC-SHA256 with 100,000 iterations and salt."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return f"{base64.b64encode(salt).decode()}:{base64.b64encode(key).decode()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against stored salt and PBKDF2 hash."""
    try:
        if ":" not in hashed_password:
            return plain_password == hashed_password

        salt_str, key_str = hashed_password.split(":", 1)
        salt = base64.b64decode(salt_str.encode())
        expected_key = base64.b64decode(key_str.encode())
        key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100_000)
        return hmac.compare_digest(key, expected_key)
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

def create_token(user_id: str, username: str, role: str) -> str:
    """Create a tamper-proof base64url signed token with timestamp and user info."""
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "iat": int(time.time()),
        "exp": int(time.time()) + TOKEN_EXPIRY_SECONDS,
    }
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    signature = hmac.new(AUTH_SECRET.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"


def decode_token(token: str) -> Optional[dict]:
    """Validate signature and expiration of a signed token."""
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
        return payload
    except Exception:
        return None


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
    """FastAPI dependency: authenticates user and returns DB User instance."""
    token = get_token_from_request(request, bearer)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(token)
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
    return user


def get_optional_user(
    request: Request,
    bearer: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """FastAPI dependency: returns current User if authenticated, else None."""
    token = get_token_from_request(request, bearer)
    if not token:
        return None
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        return None
    return db.query(User).filter(User.id == payload["sub"], User.is_active == True).first()


def require_role(allowed_roles: List[str]):
    """Decorator dependency factory enforcing specific role permissions."""
    def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: User role '{user.role}' lacks permission. Required: {allowed_roles}",
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

        log_entry = AuditLog(
            user_id=user.id if user else None,
            username=user.username if user else "anonymous",
            role=user.role if user else None,
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
