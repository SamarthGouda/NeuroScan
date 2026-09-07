"""
NEUROSCAN AI — Audit Log Management Routes (/api/audit/*)
=========================================================
Administrator-only audit trail search, filtering, and inspection.
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from datetime import datetime

from database import get_db, AuditLog, User
from auth import require_role

router = APIRouter()


def _format_log(log: AuditLog) -> dict:
    return {
        "id": log.id,
        "userId": log.user_id,
        "username": log.username or "anonymous",
        "role": log.role or "public",
        "action": log.action,
        "resourceType": log.resource_type,
        "resourceId": log.resource_id,
        "details": log.details,
        "ipAddress": log.ip_address,
        "userAgent": log.user_agent,
        "timestamp": log.timestamp.isoformat() + "Z" if log.timestamp else None,
    }


@router.get("/audit")
def get_audit_logs(
    search: Optional[str] = Query(None, description="Search keyword in username, action, or details"),
    action: Optional[str] = Query(None, description="Filter by action type"),
    username: Optional[str] = Query(None, description="Filter by username"),
    role: Optional[str] = Query(None, description="Filter by user role"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    admin_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    q = db.query(AuditLog)

    if action:
        q = q.filter(AuditLog.action == action)
    if username:
        q = q.filter(AuditLog.username.ilike(f"%{username}%"))
    if role:
        q = q.filter(AuditLog.role == role)
    if search:
        search_pattern = f"%{search}%"
        q = q.filter(
            (AuditLog.action.ilike(search_pattern)) |
            (AuditLog.username.ilike(search_pattern)) |
            (AuditLog.details.ilike(search_pattern)) |
            (AuditLog.resource_type.ilike(search_pattern))
        )

    total_count = q.count()
    logs = q.order_by(desc(AuditLog.timestamp)).offset(offset).limit(limit).all()

    return {
        "total": total_count,
        "logs": [_format_log(log) for log in logs],
    }
