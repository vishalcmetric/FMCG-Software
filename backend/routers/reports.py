"""
Reports & Analytics router.
Provides aggregated stats for the Reports & Analytics view.
Groups by PPD (top-level entity).
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth import get_current_user
from orm_models import PPDSubmission, Task, AuditLog, Formula, RegulatoryCheck, PlantTrial, SensoryEvaluation, CostingRecord

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/summary")
async def get_reports_summary(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns aggregated metrics grouped by PPD."""
    role = current_user.get("role", "fd")

    # PPD counts by status
    status_rows = await db.execute(
        select(PPDSubmission.status, func.count().label("cnt"))
        .group_by(PPDSubmission.status)
    )
    by_status = {r.status: r.cnt for r in status_rows}

    # PPD counts by brand
    brand_rows = await db.execute(
        select(PPDSubmission.brand, func.count().label("cnt"))
        .group_by(PPDSubmission.brand)
        .order_by(func.count().desc())
        .limit(10)
    )
    by_brand = [{"brand": r.brand, "count": r.cnt} for r in brand_rows]

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

    # Total PPDs
    total_ppds = (await db.execute(select(func.count()).select_from(PPDSubmission))).scalar() or 0
    active_ppds = (await db.execute(
        select(func.count()).select_from(PPDSubmission)
        .where(PPDSubmission.status.not_in(["CEO Approved", "Archived"]))
    )).scalar() or 0
    approved_ppds = by_status.get("CEO Approved", 0) + by_status.get("Approved", 0)

    return {
        "total_ppds": total_ppds,
        "active_ppds": active_ppds,
        "approved_ppds": approved_ppds,
        "by_status": by_status,
        "by_brand": by_brand,
        "formulas_by_status": formulas_by_status,
        "regulatory_by_status": reg_by_status,
        "trials_by_status": trials_by_status,
        "sensory_by_status": sensory_by_status,
        "recent_activity_30d": recent_activity,
    }
