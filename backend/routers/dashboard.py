"""
Dashboard router — role-aware stats, tasks, activity, and PPD section.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db, fmt_ist
from auth import get_current_user
from models import DashboardResponse, StatCard, PendingTask, ActivityItem, PipelineStage
from orm_models import PPDSubmission, Task, AuditLog
from datetime import datetime, timedelta
from database import IST

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# Roles that see all PPDs (not filtered by teams_involved)
_FULL_ROLES = ("admin",)

# Management roles — see PPDs only after SubmittedForApproval
_MGMT_ROLES = ("mgmt", "ceo", "rd_head", "regulatory", "marketing", "sa")


# ── helpers ───────────────────────────────────────────────────────────────────

def _ppd_filter(q, role: str):
    """Apply visibility filter based on role — only show PPDs in teams_involved."""
    if role in _FULL_ROLES:
        return q  # admin sees all
    return q.where(PPDSubmission.teams_involved.contains(role))


async def _build_stats(db: AsyncSession, role: str, user_email: str) -> list[StatCard]:
    active_ppds = (await db.execute(
        _ppd_filter(select(func.count()).select_from(PPDSubmission), role)
        .where(PPDSubmission.status.in_([
            "Pending", "Rework", "ReviewerApproved",
            "MgmtReview", "MgmtApproved", "FinalReview"
        ]))
    )).scalar() or 0

    # Count ONLY tasks assigned to this specific role (never all roles)
    # admin sees all; every other role sees only their own tasks
    active_ppd_ids = select(PPDSubmission.ppd_id).where(
        PPDSubmission.status.not_in(["Approved", "Completed"])
    )
    pending_q = (
        select(func.count()).select_from(Task)
        .where(Task.status == "pending")
        .where(Task.ppd_id.in_(active_ppd_ids))
    )
    if role not in _FULL_ROLES:
        pending_q = pending_q.where(Task.assigned_role == role)
    pending_approvals = (await db.execute(pending_q)).scalar() or 0

    under_review = (await db.execute(
        _ppd_filter(select(func.count()).select_from(PPDSubmission), role)
        .where(PPDSubmission.status.in_(["Pending", "Rework"]))
    )).scalar() or 0

    approved = (await db.execute(
        _ppd_filter(select(func.count()).select_from(PPDSubmission), role)
        .where(PPDSubmission.status == "Approved")
    )).scalar() or 0

    return [
        StatCard(label="Active PPDs",       value=active_ppds,      change="", icon="FileText",    color="from-emerald-500 to-emerald-700"),
        StatCard(label="Pending Approvals", value=pending_approvals, change="", icon="FileCheck2",  color="from-orange-500 to-orange-700"),
        StatCard(label="Under Review",      value=under_review,      change="", icon="FlaskConical", color="from-blue-500 to-blue-700"),
        StatCard(label="Approved PPDs",     value=approved,          change="", icon="CheckCircle2", color="from-purple-500 to-purple-700"),
    ]


async def _build_ppds(db: AsyncSession, role: str) -> list[dict]:
    """Return the most recent PPDs visible to this role, for the dashboard PPD section."""
    stmt = (
        _ppd_filter(select(PPDSubmission), role)
        .order_by(PPDSubmission.updated_at.desc())
        .limit(5)
    )
    result = await db.execute(stmt)
    ppds = result.scalars().all()
    return [
        {
            "ppd_id":       p.ppd_id,
            "ppd_title":    p.ppd_title or p.project_name,
            "project_name": p.project_name,
            "brand":        p.brand,
            "status":       p.status,
            "ppd_version":  p.ppd_version,
            "created_by":   p.created_by,
            "updated_at":   fmt_ist(p.updated_at),
        }
        for p in ppds
    ]


async def _build_tasks(db: AsyncSession, role: str, user_email: str) -> list[PendingTask]:
    # Only show tasks for PPDs that are still active (not Approved/Completed/deleted)
    active_ppd_ids = select(PPDSubmission.ppd_id).where(
        PPDSubmission.status.not_in(["Approved", "Completed"])
    )
    stmt = (
        select(Task)
        .where(Task.status == "pending")           # only truly pending tasks
        .where(Task.ppd_id.in_(active_ppd_ids))   # skip orphaned + terminal-state tasks
    )
    if role not in _FULL_ROLES:
        stmt = stmt.where(Task.assigned_role == role)
    stmt = stmt.order_by(Task.due_date).limit(20)

    result = await db.execute(stmt)
    return [
        PendingTask(
            project=t.project_name or "",
            task=t.title,
            priority=t.priority or "Medium",
            due=t.due_label or "—",
            project_id=t.ppd_id or t.project_id,
            task_id=t.id,
            task_type=t.type,
            status=t.status or "pending",
        )
        for t in result.scalars().all()
    ]


async def _build_activity(db: AsyncSession, role: str) -> list[ActivityItem]:
    stmt = select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(10)
    if role not in _FULL_ROLES:
        stmt = stmt.where(AuditLog.involved_roles.contains(role))

    result = await db.execute(stmt)
    return [
        ActivityItem(
            user=l.user_name or "System",
            action=l.action_label or l.action or "",
            project=l.entity or "",
            time=l.time_ago or "—",
        )
        for l in result.scalars().all()
    ]


# ── seed fallback data — shown only when DB is truly empty ────────────────────
SEED_STATS = [
    StatCard(label="Active PPDs",       value=0, change="", icon="FileText",    color="from-emerald-500 to-emerald-700"),
    StatCard(label="Pending Approvals", value=0, change="", icon="FileCheck2",  color="from-orange-500 to-orange-700"),
    StatCard(label="Under Review",      value=0, change="", icon="FlaskConical", color="from-blue-500 to-blue-700"),
    StatCard(label="Approved PPDs",     value=0, change="", icon="CheckCircle2", color="from-purple-500 to-purple-700"),
]
SEED_TASKS: list = []
SEED_ACTIVITY: list = []
SEED_PIPELINE: list[PipelineStage] = []   # pipeline removed — PPD is top-level entity

ROLE_SEED_OVERRIDES = {
    "fd": {
        "stats": [
            StatCard(label="My Formulas",       value=8, change="+2", icon="FlaskConical", color="from-emerald-500 to-emerald-700"),
            StatCard(label="Pending Lab Tests",  value=3, change="+1", icon="FileCheck2",   color="from-orange-500 to-orange-700"),
            StatCard(label="Awaiting Approval",  value=2, change="0",  icon="Clock",        color="from-blue-500 to-blue-700"),
            StatCard(label="Completed Trials",   value=5, change="+1", icon="CheckCircle2", color="from-purple-500 to-purple-700"),
        ],
        "tasks": [
            PendingTask(project="Complan Pro Chocolate", task="Update formula F-04 protein %", priority="High",   due="Today"),
            PendingTask(project="Sugar Free Stevia+",    task="Lab trial report submission",   priority="Medium", due="Tomorrow"),
            PendingTask(project="Nycil Cool Menthol XT", task="Stability test initiation",     priority="High",   due="Today"),
        ],
    },
    "regulatory": {
        "stats": [
            StatCard(label="Pending Reviews",     value=5, change="+2", icon="ShieldCheck",  color="from-red-500 to-red-700"),
            StatCard(label="Approved This Month", value=8, change="+3", icon="CheckCircle2", color="from-emerald-500 to-emerald-700"),
            StatCard(label="Rework Requested",    value=2, change="-1", icon="AlertCircle",  color="from-orange-500 to-orange-700"),
            StatCard(label="Overdue Items",        value=1, change="0",  icon="XCircle",      color="from-purple-500 to-purple-700"),
        ],
        "tasks": [
            PendingTask(project="Glucon-D Immunity+", task="Regulatory Assessment",       priority="Medium", due="2 days"),
            PendingTask(project="Complan NutriGro",   task="Ingredient compliance check", priority="High",   due="Today"),
        ],
    },
}


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    role  = current_user.get("role", "fd")
    email = current_user.get("sub", "")

    # Always use live data — seed fallback is now all-zeros
    stats       = await _build_stats(db, role, email)
    tasks       = await _build_tasks(db, role, email)
    activity    = await _build_activity(db, role)
    recent_ppds = await _build_ppds(db, role)

    return DashboardResponse(
        stats=stats,
        pending_tasks=tasks,
        recent_activity=activity,
        pipeline=SEED_PIPELINE,
        role=role,
        recent_ppds=recent_ppds,
    )


@router.get("/summary")
async def get_dashboard_summary(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lightweight summary — used for the header notification badge."""
    role = current_user.get("role", "fd")
    active_ppd_ids = select(PPDSubmission.ppd_id).where(
        PPDSubmission.status.not_in(["Approved", "Completed"])
    )
    stmt = (
        select(func.count()).select_from(Task)
        .where(Task.status == "pending")
        .where(Task.ppd_id.in_(active_ppd_ids))
    )
    if role not in _FULL_ROLES:
        stmt = stmt.where(Task.assigned_role == role)
    pending = (await db.execute(stmt)).scalar() or 0
    return {"pending_tasks": pending, "role": role}
