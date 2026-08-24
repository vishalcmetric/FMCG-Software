"""
Reports & Analytics router.
Provides aggregated stats for the Reports & Analytics view.
Any authenticated user can read; data is role-filtered.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth import get_current_user
from orm_models import Project, Task, AuditLog, Formula, RegulatoryCheck, PlantTrial, SensoryEvaluation, CostingRecord

router = APIRouter(prefix="/api/reports", tags=["reports"])

_FULL_ROLES = ("admin", "mgmt", "ceo")


def _role_filter(stmt, role: str):
    if role not in _FULL_ROLES:
        return stmt.where(Project.teams_involved.contains(role))
    return stmt


@router.get("/summary")
async def get_reports_summary(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns aggregated metrics for the reports dashboard."""
    role = current_user.get("role", "fd")

    # Project counts by status
    status_rows = await db.execute(
        select(Project.status, func.count().label("cnt"))
        .group_by(Project.status)
    )
    by_status = {r.status: r.cnt for r in status_rows}

    # Project counts by brand
    brand_rows = await db.execute(
        select(Project.brand, func.count().label("cnt"))
        .group_by(Project.brand)
        .order_by(func.count().desc())
        .limit(10)
    )
    by_brand = [{"brand": r.brand, "count": r.cnt} for r in brand_rows]

    # Project counts by type
    type_rows = await db.execute(
        select(Project.type, func.count().label("cnt"))
        .group_by(Project.type)
    )
    by_type = [{"type": r.type, "count": r.cnt} for r in type_rows]

    # Priority breakdown
    priority_rows = await db.execute(
        select(Project.priority, func.count().label("cnt"))
        .group_by(Project.priority)
    )
    by_priority = {r.priority: r.cnt for r in priority_rows}

    # Formulas by status
    formula_rows = await db.execute(
        select(Formula.status, func.count().label("cnt"))
        .group_by(Formula.status)
    )
    formulas_by_status = {r.status: r.cnt for r in formula_rows}

    # Regulatory checks summary
    reg_rows = await db.execute(
        select(RegulatoryCheck.status, func.count().label("cnt"))
        .group_by(RegulatoryCheck.status)
    )
    reg_by_status = {r.status: r.cnt for r in reg_rows}

    # Plant trial summary
    trial_rows = await db.execute(
        select(PlantTrial.status, func.count().label("cnt"))
        .group_by(PlantTrial.status)
    )
    trials_by_status = {r.status: r.cnt for r in trial_rows}

    # Sensory summary
    sensory_rows = await db.execute(
        select(SensoryEvaluation.status, func.count().label("cnt"))
        .group_by(SensoryEvaluation.status)
    )
    sensory_by_status = {r.status: r.cnt for r in sensory_rows}

    # Recent activity count (last 30 days)
    from datetime import datetime, timedelta, timezone
    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=30)
    recent_activity = (await db.execute(
        select(func.count()).select_from(AuditLog).where(AuditLog.timestamp >= since)
    )).scalar() or 0

    # Total projects
    total_projects = (await db.execute(select(func.count()).select_from(Project))).scalar() or 0
    active_projects = (await db.execute(
        select(func.count()).select_from(Project).where(Project.status.not_in(["Completed", "Archived"]))
    )).scalar() or 0
    completed_projects = by_status.get("Completed", 0)

    return {
        "total_projects": total_projects,
        "active_projects": active_projects,
        "completed_projects": completed_projects,
        "by_status": by_status,
        "by_brand": by_brand,
        "by_type": by_type,
        "by_priority": by_priority,
        "formulas_by_status": formulas_by_status,
        "regulatory_by_status": reg_by_status,
        "trials_by_status": trials_by_status,
        "sensory_by_status": sensory_by_status,
        "recent_activity_30d": recent_activity,
    }
