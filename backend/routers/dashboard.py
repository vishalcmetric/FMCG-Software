"""
Dashboard router — role-aware stats, tasks, activity, pipeline.
The master admin (role=admin) sees the full platform view.
Every other role sees a filtered/personalized view.
Data is read from MySQL via SQLAlchemy; if tables are empty the seed fallback is used.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, and_, not_
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth import get_current_user
from models import DashboardResponse, StatCard, PendingTask, ActivityItem, PipelineStage
from orm_models import Project, Task, AuditLog
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

_FULL_ROLES = ("admin", "mgmt", "ceo")


# ── helpers ───────────────────────────────────────────────────────────────────

async def _build_stats(db: AsyncSession, role: str, user_email: str) -> list[StatCard]:
    def _role_proj(q):
        if role not in _FULL_ROLES:
            return q.where(Project.teams_involved.contains(role))
        return q

    def _role_task(q):
        if role not in _FULL_ROLES:
            return q.where(Task.assigned_role == role)
        return q

    active = (await db.execute(
        _role_proj(select(func.count()).select_from(Project))
        .where(Project.status.not_in(["Completed", "Archived"]))
    )).scalar() or 0

    pending_approvals = (await db.execute(
        _role_task(select(func.count()).select_from(Task))
        .where(and_(Task.type == "approval", Task.status == "pending"))
    )).scalar() or 0

    in_formulation = (await db.execute(
        _role_proj(select(func.count()).select_from(Project))
        .where(Project.status == "Formulation")
    )).scalar() or 0

    since_90 = datetime.now(timezone.utc) - timedelta(days=90)
    completed_q = (await db.execute(
        _role_proj(select(func.count()).select_from(Project))
        .where(and_(Project.status == "Completed", Project.updated_at >= since_90))
    )).scalar() or 0

    return [
        StatCard(label="Active Projects",   value=active,            change="+3", icon="FolderKanban", color="from-emerald-500 to-emerald-700"),
        StatCard(label="Pending Approvals", value=pending_approvals, change="+2", icon="FileCheck2",   color="from-orange-500 to-orange-700"),
        StatCard(label="In Formulation",    value=in_formulation,    change="-1", icon="FlaskConical", color="from-blue-500 to-blue-700"),
        StatCard(label="Completed (Q1)",    value=completed_q,       change="+5", icon="CheckCircle2", color="from-purple-500 to-purple-700"),
    ]


async def _build_tasks(db: AsyncSession, role: str, user_email: str) -> list[PendingTask]:
    stmt = select(Task).where(Task.status == "pending")
    if role not in _FULL_ROLES:
        stmt = stmt.where(Task.assigned_role == role)
    stmt = stmt.order_by(Task.due_date).limit(10)

    result = await db.execute(stmt)
    return [
        PendingTask(
            project=t.project_name or "",
            task=t.title,
            priority=t.priority or "Medium",
            due=t.due_label or "—",
            project_id=t.project_id,
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


async def _build_pipeline(db: AsyncSession, role: str) -> list[PipelineStage]:
    stages = [
        ("PPD Draft",   "Draft",             10),
        ("PPD Review",  "PPD Review",        25),
        ("Formulation", "Formulation",       60),
        ("Sensory/Reg", "Regulatory Review", 45),
        ("Plant Trial", "Plant Trial",       80),
        ("Approvals",   "CEO Approval",      90),
    ]
    result = []
    for label, status, progress in stages:
        stmt = select(func.count()).select_from(Project).where(Project.status == status)
        if role not in _FULL_ROLES:
            stmt = stmt.where(Project.teams_involved.contains(role))
        count = (await db.execute(stmt)).scalar() or 0
        result.append(PipelineStage(stage=label, count=count, progress=progress))
    return result


# ── seed fallback data (used when DB is empty) ────────────────────────────────
SEED_STATS = [
    StatCard(label="Active Projects",   value=24, change="+3", icon="FolderKanban", color="from-emerald-500 to-emerald-700"),
    StatCard(label="Pending Approvals", value=7,  change="+2", icon="FileCheck2",   color="from-orange-500 to-orange-700"),
    StatCard(label="In Formulation",    value=12, change="-1", icon="FlaskConical", color="from-blue-500 to-blue-700"),
    StatCard(label="Completed (Q1)",    value=18, change="+5", icon="CheckCircle2", color="from-purple-500 to-purple-700"),
]
SEED_TASKS = [
    PendingTask(project="Complan Pro Chocolate",    task="Review PPD v2.1",           priority="High",     due="Today"),
    PendingTask(project="Sugar Free Green Stevia+", task="Approve Formulation",       priority="Medium",   due="Tomorrow"),
    PendingTask(project="Everyuth Aloe Face Wash",  task="Sensory Evaluation Report", priority="Critical", due="Today"),
    PendingTask(project="Glucon-D Immunity+",       task="Regulatory Assessment",     priority="Medium",   due="2 days"),
]
SEED_ACTIVITY = [
    ActivityItem(user="Priya S.",   action="submitted FD for approval", project="Sugar Free Stevia+", time="5m"),
    ActivityItem(user="CEO Office", action="approved final PPD",        project="Everyuth Aloe",      time="25m"),
    ActivityItem(user="Rahul M.",   action="created new project",       project="Complan NutriGro",   time="1h"),
    ActivityItem(user="Regulatory", action="requested rework",          project="Nycil XT",           time="2h"),
    ActivityItem(user="Plant Team", action="uploaded stability report", project="Glucon-D",           time="3h"),
]
SEED_PIPELINE = [
    PipelineStage(stage="PPD Draft",   count=6,  progress=10),
    PipelineStage(stage="PPD Review",  count=4,  progress=25),
    PipelineStage(stage="Formulation", count=12, progress=60),
    PipelineStage(stage="Sensory/Reg", count=8,  progress=45),
    PipelineStage(stage="Plant Trial", count=3,  progress=80),
    PipelineStage(stage="Approvals",   count=7,  progress=90),
]

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
    "marketing": {
        "stats": [
            StatCard(label="My PPDs Under Review",  value=3,  change="+1", icon="FileText",     color="from-pink-500 to-pink-700"),
            StatCard(label="Awaiting Brief",         value=4,  change="+2", icon="ClipboardList",color="from-orange-500 to-orange-700"),
            StatCard(label="Active Brand Projects",  value=11, change="+2", icon="Package",      color="from-blue-500 to-blue-700"),
            StatCard(label="Launches This Quarter",  value=2,  change="0",  icon="TrendingUp",   color="from-purple-500 to-purple-700"),
        ],
        "tasks": [
            PendingTask(project="Complan Pro Chocolate", task="Review PPD v2.1",       priority="High",     due="Today"),
            PendingTask(project="Everyuth Aloe",         task="Provide artwork brief", priority="Critical", due="Today"),
        ],
    },
    "production": {
        "stats": [
            StatCard(label="Plant Trials Scheduled", value=4, change="+1", icon="Factory",     color="from-orange-500 to-orange-700"),
            StatCard(label="Trials In Progress",     value=2, change="0",  icon="RefreshCw",   color="from-blue-500 to-blue-700"),
            StatCard(label="Trials Completed",       value=7, change="+3", icon="CheckCircle2",color="from-emerald-500 to-emerald-700"),
            StatCard(label="Batch Failures",         value=1, change="-1", icon="XCircle",     color="from-purple-500 to-purple-700"),
        ],
        "tasks": [
            PendingTask(project="Nycil Cool Menthol XT", task="Pilot batch report upload",  priority="High",   due="Today"),
            PendingTask(project="Glucon-D Immunity+",    task="Scale-up trial scheduling",  priority="Medium", due="3 days"),
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

    # Check if tables have data
    has_projects = ((await db.execute(select(func.count()).select_from(Project))).scalar() or 0) > 0
    has_tasks    = ((await db.execute(select(func.count()).select_from(Task))).scalar() or 0) > 0
    has_logs     = ((await db.execute(select(func.count()).select_from(AuditLog))).scalar() or 0) > 0

    if has_projects:
        stats    = await _build_stats(db, role, email)
        pipeline = await _build_pipeline(db, role)
    else:
        override = ROLE_SEED_OVERRIDES.get(role, {})
        stats    = override.get("stats", SEED_STATS)
        pipeline = SEED_PIPELINE

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
        pipeline=pipeline,
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
