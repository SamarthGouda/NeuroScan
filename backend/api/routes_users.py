"""
NEUROSCAN AI — User Management Routes (/api/users/*)
====================================================
Administrator-only endpoints for managing hospital staff accounts.
"""
from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
import uuid

from database import get_db, User
from auth import require_role, hash_password, log_audit_event

router = APIRouter()


class UserCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str
    full_name: str = Field(..., min_length=2, max_length=100)
    role: str = Field(..., pattern="^(doctor|technician|admin)$")
    password: str = Field(..., min_length=6)
    title: Optional[str] = None


class UserUpdateRequest(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    title: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


def _format_user(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "fullName": user.full_name,
        "role": user.role,
        "title": user.title,
        "avatar": user.avatar or f"{user.full_name[:2]}".upper(),
        "isActive": user.is_active,
        "createdAt": user.created_at.isoformat() + "Z" if user.created_at else None,
    }


@router.get("/users")
def list_users(
    admin_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(desc(User.created_at)).all()
    return [_format_user(u) for u in users]


@router.post("/users")
def create_user(
    req: UserCreateRequest,
    request: Request,
    admin_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    # Check duplicate username
    if db.query(User).filter(User.username == req.username.strip().lower()).first():
        raise HTTPException(status_code=400, detail=f"Username '{req.username}' already exists.")
    
    # Check duplicate email
    if db.query(User).filter(User.email == req.email.strip().lower()).first():
        raise HTTPException(status_code=400, detail=f"Email '{req.email}' already exists.")

    avatar = "".join([part[0] for part in req.full_name.split()[:2]]).upper()

    new_user = User(
        id=str(uuid.uuid4()),
        username=req.username.strip().lower(),
        email=req.email.strip().lower(),
        full_name=req.full_name.strip(),
        role=req.role,
        password_hash=hash_password(req.password),
        title=req.title or ("Doctor" if req.role == "doctor" else req.role.capitalize()),
        avatar=avatar,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit_event(
        db=db,
        action="CREATE_USER",
        user=admin_user,
        resource_type="user",
        resource_id=new_user.id,
        details=f"Created staff account '{new_user.username}' with role '{new_user.role}'",
        request=request,
    )

    return _format_user(new_user)


@router.put("/users/{user_id}")
def update_user(
    user_id: str,
    req: UserUpdateRequest,
    request: Request,
    admin_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    if req.email:
        existing = db.query(User).filter(User.email == req.email.strip().lower(), User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already used by another account.")
        target_user.email = req.email.strip().lower()

    if req.full_name:
        target_user.full_name = req.full_name.strip()
        target_user.avatar = "".join([part[0] for part in target_user.full_name.split()[:2]]).upper()

    if req.role and req.role in ["doctor", "technician", "admin"]:
        target_user.role = req.role

    if req.title is not None:
        target_user.title = req.title

    if req.is_active is not None:
        target_user.is_active = req.is_active

    if req.password:
        target_user.password_hash = hash_password(req.password)

    db.commit()
    db.refresh(target_user)

    log_audit_event(
        db=db,
        action="UPDATE_USER",
        user=admin_user,
        resource_type="user",
        resource_id=target_user.id,
        details=f"Updated profile for staff member '{target_user.username}'",
        request=request,
    )

    return _format_user(target_user)


@router.delete("/users/{user_id}")
def toggle_user_active(
    user_id: str,
    request: Request,
    admin_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    if user_id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own administrator account.")

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    target_user.is_active = not target_user.is_active
    db.commit()

    action_label = "ACTIVATED_USER" if target_user.is_active else "DEACTIVATED_USER"
    log_audit_event(
        db=db,
        action=action_label,
        user=admin_user,
        resource_type="user",
        resource_id=target_user.id,
        details=f"{'Activated' if target_user.is_active else 'Deactivated'} account '{target_user.username}'",
        request=request,
    )

    return {"message": f"User status set to {'active' if target_user.is_active else 'inactive'}.", "isActive": target_user.is_active}
