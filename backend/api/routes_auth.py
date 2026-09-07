"""
NEUROSCAN AI — Authentication Routes (/api/auth/*)
===================================================
Handles login, current user session retrieval, token verification, and logout.
"""
from fastapi import APIRouter, HTTPException, Request, Response, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db, User
from auth import (
    hash_password, verify_password, create_token, decode_token,
    get_current_user, get_optional_user, log_audit_event, get_token_from_request
)

router = APIRouter()


class LoginRequest(BaseModel):
    username: str = Field(..., description="Username or email")
    password: str = Field(..., description="User password")


class TokenVerifyRequest(BaseModel):
    token: str


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


@router.post("/login")
def login(req: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    login_id = req.username.strip().lower()
    
    # Match on username or email
    user = db.query(User).filter(
        (User.username == login_id) | (User.email == login_id)
    ).first()

    if not user or not verify_password(req.password, user.password_hash):
        log_audit_event(
            db=db,
            action="LOGIN_FAILED",
            details=f"Failed login attempt for username/email '{req.username}'",
            request=request
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password.")

    if not user.is_active:
        log_audit_event(
            db=db,
            action="LOGIN_BLOCKED",
            user=user,
            details=f"Inactive account login attempt for user '{user.username}'",
            request=request
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated. Contact Administrator.")

    token = create_token(user.id, user.username, user.role)

    # Set HTTP-only cookie
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=86400 * 7,
        path="/",
    )

    log_audit_event(
        db=db,
        action="LOGIN_SUCCESS",
        user=user,
        resource_type="user",
        resource_id=user.id,
        details=f"User '{user.username}' logged in successfully as {user.role}",
        request=request
    )

    return _format_user_response(user, token)


@router.get("/user")
def get_user(request: Request, user: User = Depends(get_current_user)):
    """Return currently authenticated user details. Must NEVER return HTML."""
    return _format_user_response(user)


@router.post("/verify")
def verify(req: TokenVerifyRequest, db: Session = Depends(get_db)):
    payload = decode_token(req.token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")
    
    user = db.query(User).filter(User.id == payload["sub"], User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found.")
    
    return _format_user_response(user, req.token)


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    try:
        user = get_optional_user(request, db=db)
        if user:
            log_audit_event(
                db=db,
                action="LOGOUT",
                user=user,
                details=f"User '{user.username}' logged out",
                request=request
            )
    except Exception:
        pass
    response.delete_cookie(key="auth_token", path="/", httponly=True, samesite="lax")
    return {"message": "Logged out successfully."}
