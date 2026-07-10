"""
Notifications router — per-role notification feed.
GET  /api/notifications          → list unread (+ recent read) for current user's role
GET  /api/notifications/count    → unread count only (lightweight poll)
POST /api/notifications/{id}/read → mark one as read
POST /api/notifications/read-all  → mark all as read for this role
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, or_, update
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth import get_current_user
from orm_models import Notification

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

_FULL_ROLES = ("admin", "mgmt", "ceo")


def _notif_out(n: Notification) -> dict:
    return {
        "id":          n.id,
        "title":       n.title,
        "message":     n.message,
        "action_type": n.action_type,
        "entity_id":   n.entity_id,
        "entity_name": n.entity_name,
        "created_by":  n.created_by,
        "is_read":     n.is_read,
        "created_at":  n.created_at.isoformat() if n.created_at else None,
    }


def _role_filter(stmt, role: str):
    """Filter notifications targeting this role or 'all'."""
    return stmt.where(
        or_(Notification.target_role == role, Notification.target_role == "all")
    )


@router.get("/count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role", "fd")
    stmt = _role_filter(
        select(func.count()).select_from(Notification).where(Notification.is_read == False),  # noqa
        role,
    )
    count = (await db.execute(stmt)).scalar() or 0
    return {"unread": count, "role": role}


@router.get("")
async def list_notifications(
    limit: int = Query(30, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role", "fd")
    stmt = _role_filter(select(Notification), role)
    stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    return [_notif_out(n) for n in result.scalars().all()]


@router.post("/{notif_id}/read")
async def mark_read(
    notif_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role", "fd")
    stmt = (
        update(Notification)
        .where(
            Notification.id == notif_id,
            or_(Notification.target_role == role, Notification.target_role == "all"),
        )
        .values(is_read=True)
    )
    await db.execute(stmt)
    await db.commit()
    return {"ok": True}


@router.post("/read-all")
async def mark_all_read(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role", "fd")
    stmt = (
        update(Notification)
        .where(
            or_(Notification.target_role == role, Notification.target_role == "all"),
            Notification.is_read == False,  # noqa
        )
        .values(is_read=True)
    )
    await db.execute(stmt)
    await db.commit()
    return {"ok": True}
