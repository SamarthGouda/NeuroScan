"""
NEUROSCAN AI — Notification Routes (/api/notifications/*)
=========================================================
Provides real-time clinical notification endpoints:
  - GET /api/notifications : Fetch unread & recent notifications
  - POST /api/notifications/{id}/read : Mark a notification as read
  - POST /api/notifications/read-all : Mark all notifications read
"""
from fastapi import APIRouter, HTTPException, Depends, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, and_
from typing import Optional, List

from database import get_db, Notification, User
from auth import get_current_user

router = APIRouter()


@router.get("/notifications")
def get_notifications(
    limit: int = 30,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Fetch notifications relevant to the authenticated user:
      1. Directly targeted to user.id
      2. Targeted to user.role (e.g. doctor, technician, admin)
      3. Global notifications (target_role is NULL and user_id is NULL)
    """
    query = db.query(Notification).filter(
        or_(
            Notification.user_id == user.id,
            Notification.target_role == user.role,
            and_(Notification.user_id == None, Notification.target_role == None),
        )
    ).order_by(desc(Notification.created_at))

    notifications = query.limit(limit).all()

    unread_count = db.query(Notification).filter(
        or_(
            Notification.user_id == user.id,
            Notification.target_role == user.role,
            and_(Notification.user_id == None, Notification.target_role == None),
        ),
        Notification.is_read == False,
    ).count()

    results = []
    for n in notifications:
        results.append({
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type or "info",
            "link": n.link,
            "isRead": n.is_read,
            "targetRole": n.target_role,
            "createdAt": n.created_at.isoformat() + "Z" if n.created_at else None,
        })

    return {
        "notifications": results,
        "unreadCount": unread_count,
    }


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Mark a single notification as read."""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")

    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read.", "id": notification_id}


@router.post("/notifications/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Mark all relevant notifications as read."""
    db.query(Notification).filter(
        or_(
            Notification.user_id == user.id,
            Notification.target_role == user.role,
            and_(Notification.user_id == None, Notification.target_role == None),
        ),
        Notification.is_read == False,
    ).update({"is_read": True}, synchronize_session=False)

    db.commit()
    return {"message": "All notifications marked as read."}
