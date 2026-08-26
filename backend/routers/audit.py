"""
Audit router — full activity trail, admin + mgmt + ceo read access.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db, fmt_ist
from auth import get_current_user
from orm_models import AuditLog

router = APIRouter(prefix="/api/audit", tags=["audit"])

ALLOWED_ROLES = {"admin", "mgmt", "ceo"}


@router.get("")
async def get_audit_logs(
    limit: int = Query(50, le=200),
    skip: int = Query(0),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role", "fd")

    stmt = select(AuditLog)
    count_stmt = select(func.count()).select_from(AuditLog)

    # Non-admin roles only see their own logs
    if role not in ALLOWED_ROLES:
        user_email = current_user.get("sub")
        stmt = stmt.where(AuditLog.user_email == user_email)
        count_stmt = count_stmt.where(AuditLog.user_email == user_email)

    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    stmt = stmt.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)

    logs = []
    for l in result.scalars().all():
        logs.append({
            "id":            l.id,
            "user_name":     l.user_name,
            "user_email":    l.user_email,
            "action":        l.action,
            "action_label":  l.action_label,
            "entity":        l.entity,
            "involved_roles": l.involved_roles,
            "ip":            l.ip,
            "time_ago":      l.time_ago,
            "timestamp":     fmt_ist(l.timestamp),
        })

    return {"total": total, "logs": logs}
