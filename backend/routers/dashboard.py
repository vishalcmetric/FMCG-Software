"""
Dashboard router — role-aware stats, tasks, activity.
PPD is now the top-level entity; pipeline section removed.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth import get_current_user
from models import DashboardResponse, StatCard, PendingTask, ActivityItem, PipelineStage
from orm_models import PPDSubmission, Task, AuditLog
from datetime import datetime, timedelta
from database import IST

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

_FULL_ROLES = ("admin", "mgmt", "ceo")


# ── helpers ───────────────────────────────────────────────────────────────────

async def _build_stats(db: AsyncSession, role: str, user_email: str) -> list[StatCard]:
    def _role_ppd(q):
        if role not in _FULL_ROLES:
            return q.where(PPDSubmission.teams_involved.contains(role))
        return q

    def _role_task(q):
        if role not in _FULL_ROLES:
            return q.where(Task.assigned_role == role)
        return q

    active_ppds = (await db.execute(
        _role_ppd(select(func.count()).select_from(PPDSubmission))
        .where(PPDSubmission.status.in_(["Pending", "Rework"]))
    )).scalar() or 0

    pending_approvals = (await db.execute(
        _role_task(select(func.count()).select_from(Task))
        .where(and_(Task.type == "approval", Task.status == "pending"))
    )).scalar() or 0

    under_review = (await db.execute(
        _role_ppd(select(func.count()).select_from(PPDSubmission))
        .where(PPDSubmission.status == "Pending")
    )).scalar() or 0

    approved = (await db.execute(
        _role_ppd(select(func.count()).select_from(PPDSubmission))
        .where(PPDSubmission.status == "Approved")
    )).scalar() or 0

    return [
        StatCard(label="Active PPDs",       value=active_ppds,      change="+3", icon="FileText",    color="from-emerald-500 to-emerald-700"),
        StatCard(label="Pending Approvals", value=pending_approvals, change="+2", icon="FileCheck2",  color="from-orange-500 to-orange-700"),
        StatCard(label="Under Review",      value=under_review,      change="-1", icon="FlaskConical", color="from-blue-500 to-blue-700"),
        StatCard(label="Approved PPDs",     value=approved,          change="+5", icon="CheckCircle2", color="from-purple-500 to-purple-700"),
    ]


async def _build_tasks(db: AsyncSession, role: str, user_email: str) -> list[PendingTask]:
    stmt = select(Task).where(Task.status.not_in(["approved"]))
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


# ── seed fallback data ────────────────────────────────────────────────────────
SEED_STATS = [
    StatCard(label="Active PPDs",       value=12, change="+3", icon="FileText",    color="from-emerald-500 to-emerald-700"),
    StatCard(label="Pending Approvals", value=7,  change="+2", icon="FileCheck2",  color="from-orange-500 to-orange-700"),
    StatCard(label="Under Review",      value=4,  change="-1", icon="FlaskConical", color="from-blue-500 to-blue-700"),
    StatCard(label="Approved PPDs",     value=8,  change="+5", icon="CheckCircle2", color="from-purple-500 to-purple-700"),
]
SEED_TASKS = [
    PendingTask(project="Complan Pro Chocolate",    task="Review PPD v2.1",           priority="High",     due="Today"),
    PendingTask(project="Sugar Free Green Stevia+", task="Approve Formulation",       priority="Medium",   due="Tomorrow"),
    PendingTask(project="Everyuth Aloe Face Wash",  task="Sensory Evaluation Report", priority="Critical", due="Today"),
    PendingTask(project="Glucon-D Immunity+",       task="Regulatory Assessment",     priority="Medium",   due="2 days"),
]
SEED_ACTIVITY = [
    ActivityItem(user="Priya S.",   action="submitted PPD for approval", project="Sugar Free Stevia+", time="5m"),
    ActivityItem(user="CEO Office", action="approved final PPD",         project="Everyuth Aloe",      time="25m"),
    ActivityItem(user="Rahul M.",   action="created new PPD",            project="Complan NutriGro",   time="1h"),
    ActivityItem(user="Regulatory", action="requested rework",           project="Nycil XT",           time="2h"),
    ActivityItem(user="Plant Team", action="uploaded stability report",  project="Glucon-D",           time="3h"),
]
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

    has_ppds  = ((await db.execute(select(func.count()).select_from(PPDSubmission))).scalar() or 0) > 0
    has_tasks = ((await db.execute(select(func.count()).select_from(Task))).scalar() or 0) > 0
    has_logs  = ((await db.execute(select(func.count()).select_from(AuditLog))).scalar() or 0) > 0

    if has_ppds:
        stats = await _build_stats(db, role, email)
    else:
        override = ROLE_SEED_OVERRIDES.get(role, {})
        stats = override.get("stats", SEED_STATS)

    if has_tasks:
        tasks = await _build_tasks(db, role, email)
    else:
        override = ROLE_SEED_OVERRIDES.get(role, {})
        tasks = override.get("tasks", SEED_TASKS)

    activity = await _build_activity(db, role) if has_logs else SEED_ACTIVITY

    return DashboardResponse(
        stats=stats,
        pending_tasks=tasks,
        recent_activity=activity,
        pipeline=SEED_PIPELINE,
        role=role,
    )


@router.get("/summary")
async def get_dashboard_summary(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lightweight summary — used for the header notification badge."""
    role = current_user.get("role", "fd")
    stmt = select(func.count()).select_from(Task).where(Task.status == "pending")
    if role not in _FULL_ROLES:
        stmt = stmt.where(Task.assigned_role == role)
    pending = (await db.execute(stmt)).scalar() or 0
    return {"pending_tasks": pending, "role": role}
