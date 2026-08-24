"""
Projects router — CRUD, search, status transitions, pipeline, team assignment.
When admin creates a project all roles are included (visible to everyone).
Fires notifications to all affected roles on every change.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth import get_current_user, require_admin
from models import ProjectCreate, ProjectUpdate, TaskCreate
from orm_models import Project, AuditLog, Task
from notify import notify_roles
from datetime import datetime, timezone

router = APIRouter(prefix="/api/projects", tags=["projects"])

ALL_ROLES = "admin,source,pm,fd,rd_head,marketing,regulatory,packaging,adl,pmsa,sa,mgmt,ceo,production"


def _proj_out(p: Project) -> dict:
    return {
        "id":             p.id,
        "project_id":     p.project_id,
        "name":           p.name,
        "brand":          p.brand,
        "type":           p.type,
        "status":         p.status,
        "progress":       p.progress,
        "priority":       p.priority,
        "owner":          p.owner,
        "owner_email":    p.owner_email,
        "objective":      p.objective,
        "target_launch":  p.target_launch,
        "teams_involved": p.teams_involved,
        "created_at":     p.created_at.isoformat() if p.created_at else None,
        "updated_at":     p.updated_at.isoformat() if p.updated_at else None,
    }


@router.get("")
async def list_projects(
    q:      str = Query("", description="Search query"),
    status: str = Query("all"),
    brand:  str = Query("all"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role", "fd")
    stmt = select(Project)

    # Admin / mgmt / ceo see all; others only see projects they're in
    if role not in ("admin", "mgmt", "ceo"):
        stmt = stmt.where(Project.teams_involved.contains(role))
    if status != "all":
        stmt = stmt.where(Project.status == status)
    if brand != "all":
        stmt = stmt.where(Project.brand == brand)
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            Project.name.ilike(pattern) | Project.project_id.ilike(pattern)
        )

    stmt = stmt.order_by(Project.updated_at.desc()).limit(100)
    result = await db.execute(stmt)
    return [_proj_out(p) for p in result.scalars().all()]


@router.post("", status_code=201)
async def create_project(
    body: ProjectCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    year = datetime.now(timezone.utc).year
    count = (await db.execute(select(func.count()).select_from(Project))).scalar() or 0
    pid = f"NP-{year}-{str(count + 1).zfill(3)}"

    role = current_user.get("role", "fd")

    # Ensure key workflow roles are in teams_involved
    default_workflow_roles = ["admin", "source", "pm", "fd", "marketing", "regulatory", "packaging", "sa"]
    if role == "admin" or not body.teams_involved:
        teams = ",".join(default_workflow_roles)
    else:
        teams_list = list(dict.fromkeys(default_workflow_roles + body.teams_involved))
        teams = ",".join(teams_list)

    project = Project(
        project_id=pid,
        name=body.name,
        brand=body.brand,
        type=body.type,
        priority=body.priority,
        objective=body.objective,
        target_launch=body.target_launch,
        status="Draft",
        progress=5,
        owner=current_user.get("name", ""),
        owner_email=current_user.get("sub", ""),
        teams_involved=teams,
    )
    db.add(project)

    # Auto-assign initial tasks for the 6-stage workflow
    initial_tasks = [
        ("Create PPD for Project", "source", "PPD Creation"),
        ("Review Project Scope & Assign Teams", "pm", "PM Review"),
        ("Initial R&D / F&D Feasibility Assessment", "fd", "Feasibility"),
    ]
    for title, task_role, task_type in initial_tasks:
        db.add(Task(
            title=f"{title} ({pid})",
            project_name=body.name,
            project_id=pid,
            assigned_role=task_role,
            type=task_type,
            status="pending",
            priority=body.priority or "High",
            due_label="Today"
        ))

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="CREATE",
        action_label=f"created new project: {body.name}",
        entity=body.name,
        involved_roles=teams,
        time_ago="just now",
    ))

    # Notify all roles that a new project was added
    target_roles = teams.split(",")
    await notify_roles(
        db,
        roles=target_roles,
        title=f"New Project: {body.name}",
        message=f"{current_user.get('name','User')} created project {pid} ({body.brand} • {body.type}). Initial tasks assigned to Source, PM & F&D.",
        action_type="project_created",
        entity_id=pid,
        entity_name=body.name,
        created_by=current_user.get("name", ""),
    )

    await db.commit()
    await db.refresh(project)
    return _proj_out(project)


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.project_id == project_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "Project not found")
    return _proj_out(p)


@router.put("/{project_id}")
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.project_id == project_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "Project not found")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    for field, value in updates.items():
        setattr(p, field, value)

    # Build a human-readable change summary
    change_parts = []
    if "status" in updates:   change_parts.append(f"status → {updates['status']}")
    if "progress" in updates: change_parts.append(f"progress → {updates['progress']}%")
    if "priority" in updates: change_parts.append(f"priority → {updates['priority']}")
    if "name" in updates:     change_parts.append(f"name → {updates['name']}")
    change_summary = ", ".join(change_parts) if change_parts else "details updated"

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="UPDATE",
        action_label=f"updated {p.name} — {change_summary}",
        entity=project_id,
        involved_roles=p.teams_involved or "admin",
        time_ago="just now",
    ))

    # Notify all teams on this project
    target_roles = (p.teams_involved or "admin").split(",")
    await notify_roles(
        db,
        roles=target_roles,
        title=f"Project Updated: {p.name}",
        message=f"{current_user.get('name','Admin')} updated {project_id} — {change_summary}.",
        action_type="project_updated",
        entity_id=project_id,
        entity_name=p.name,
        created_by=current_user.get("name", "Admin"),
    )

    await db.commit()
    return {"ok": True}


@router.patch("/{project_id}/teams")
async def update_teams(
    project_id: str,
    body: dict,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin only — assign/update teams for a project."""
    result = await db.execute(select(Project).where(Project.project_id == project_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "Project not found")

    teams = body.get("teams_involved", [])
    if isinstance(teams, list):
        teams_list = list(dict.fromkeys(["admin"] + teams))
        p.teams_involved = ",".join(teams_list)
    else:
        p.teams_involved = str(teams)

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="UPDATE",
        action_label=f"updated team assignments for {project_id}",
        entity=project_id,
        involved_roles="admin",
        time_ago="just now",
    ))
    await db.commit()
    return {"ok": True, "teams_involved": p.teams_involved}


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.project_id == project_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "Project not found")
    name = p.name
    teams = (p.teams_involved or "admin").split(",")
    await db.delete(p)

    await notify_roles(
        db,
        roles=teams,
        title=f"Project Deleted: {name}",
        message=f"{current_user.get('name','Admin')} deleted project {project_id} ({name}).",
        action_type="project_deleted",
        entity_id=project_id,
        entity_name=name,
        created_by=current_user.get("name", "Admin"),
    )

    await db.commit()
    return {"ok": True}


# ── Task endpoints ────────────────────────────────────────────────────────────

def _task_out(t: Task) -> dict:
    return {
        "id":            t.id,
        "title":         t.title,
        "project_name":  t.project_name,
        "project_id":    t.project_id,
        "assigned_role": t.assigned_role,
        "type":          t.type,
        "status":        t.status,
        "priority":      t.priority,
        "due_date":      t.due_date.isoformat() if t.due_date else None,
        "due_label":     t.due_label,
    }


# ── IMPORTANT: /tasks/mine must be registered BEFORE /{project_id}/tasks ──────
@router.get("/tasks/mine")
async def get_my_tasks(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all pending tasks assigned to the current user's role."""
    role = current_user.get("role", "fd")
    stmt = select(Task).where(Task.status == "pending")
    if role not in ("admin", "mgmt", "ceo"):
        stmt = stmt.where(Task.assigned_role == role)
    stmt = stmt.order_by(Task.due_date.asc()).limit(50)
    result = await db.execute(stmt)
    return [_task_out(t) for t in result.scalars().all()]


@router.get("/{project_id}/tasks")
async def list_project_tasks(
    project_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.project_id == project_id).order_by(Task.id.desc()))
    return [_task_out(t) for t in result.scalars().all()]


@router.post("/{project_id}/tasks", status_code=201)
async def create_project_task(
    project_id: str,
    body: TaskCreate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.project_id == project_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "Project not found")

    due_dt = None
    if body.due_date:
        try:
            due_dt = datetime.fromisoformat(body.due_date)
        except ValueError:
            pass

    task = Task(
        title=body.title,
        project_name=p.name,
        project_id=project_id,
        assigned_role=body.assigned_role,
        type=body.type or "General",
        priority=body.priority,
        status="pending",
        due_date=due_dt,
        due_label=body.due_label or (body.due_date or ""),
    )
    db.add(task)

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="CREATE",
        action_label=f"assigned task '{body.title}' to {body.assigned_role} on {project_id}",
        entity=project_id,
        involved_roles=body.assigned_role,
        time_ago="just now",
    ))

    await notify_roles(
        db,
        roles=[body.assigned_role],
        title=f"New Task Assigned: {body.title}",
        message=f"{current_user.get('name','Admin')} assigned you a task on {p.name} — {body.title}. Priority: {body.priority}.",
        action_type="task_assigned",
        entity_id=project_id,
        entity_name=p.name,
        created_by=current_user.get("name", "Admin"),
    )

    await db.commit()
    await db.refresh(task)
    return _task_out(task)


@router.patch("/{project_id}/tasks/{task_id}/complete")
async def complete_task(
    project_id: str,
    task_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Any role in the project's teams_involved can mark their assigned task as completed.
    Admin can complete any task. The status change is visible on admin panel + audit log.
    """
    result = await db.execute(select(Task).where(Task.id == task_id, Task.project_id == project_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(404, "Task not found")

    role = current_user.get("role", "fd")
    # Only the assigned role or admin/mgmt/ceo can complete
    if role not in ("admin", "mgmt", "ceo") and task.assigned_role != role:
        raise HTTPException(403, "You are not assigned to this task")

    task.status = "completed"

    proj_result = await db.execute(select(Project).where(Project.project_id == project_id))
    p = proj_result.scalars().first()

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="UPDATE",
        action_label=f"completed task '{task.title}' on {project_id}",
        entity=project_id,
        involved_roles="admin",
        time_ago="just now",
    ))

    # Notify admin that a task was completed
    await notify_roles(
        db,
        roles=["admin", "mgmt"],
        title=f"Task Completed: {task.title}",
        message=f"{current_user.get('name','User')} ({role}) completed task '{task.title}' on {p.name if p else project_id}.",
        action_type="task_assigned",
        entity_id=project_id,
        entity_name=p.name if p else project_id,
        created_by=current_user.get("name", ""),
    )

    await db.commit()
    return {"ok": True, "task": _task_out(task)}


# ── ROLE-AWARE TASK STATUS UPDATE ─────────────────────────────────────────────
# Allowed status transitions per role type:
#   approval tasks  → approve | reject | rework | in_progress
#   lab/formulation → in_progress | completed
#   sensory         → in_progress | completed (pass/fail recorded in SensoryEvaluation)
#   regulatory      → in_progress | approve | rework | completed
#   plant/production→ in_progress | completed
#   generic         → in_progress | completed

ROLE_ALLOWED_STATUSES: dict[str, list[str]] = {
    "source":     ["in_progress", "approved", "rejected", "rework", "completed"],
    "pm":         ["in_progress", "completed"],
    "fd":         ["in_progress", "completed"],
    "rd_head":    ["in_progress", "approved", "rejected", "rework", "completed"],
    "marketing":  ["in_progress", "approved", "rework", "completed"],
    "regulatory": ["in_progress", "approved", "rework", "completed"],
    "packaging":  ["in_progress", "completed"],
    "adl":        ["in_progress", "completed"],
    "pmsa":       ["in_progress", "completed"],
    "sa":         ["in_progress", "approved", "rejected", "completed"],
    "mgmt":       ["in_progress", "approved", "rejected", "rework", "completed"],
    "ceo":        ["in_progress", "approved", "rejected", "completed"],
    "production": ["in_progress", "completed"],
    "admin":      ["in_progress", "approved", "rejected", "rework", "completed", "cancelled"],
}

STATUS_LABELS: dict[str, str] = {
    "in_progress": "Mark In Progress",
    "approved":    "Approve",
    "rejected":    "Reject",
    "rework":      "Request Rework",
    "completed":   "Mark Complete",
    "cancelled":   "Cancel Task",
}


@router.patch("/{project_id}/tasks/{task_id}/status")
async def update_task_status(
    project_id: str,
    task_id: int,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Role-aware task status update.
    Each role can only set statuses defined in ROLE_ALLOWED_STATUSES.
    Only the assigned role (or admin/mgmt/ceo) can update a task.
    """
    new_status = (body.get("status") or "").strip()
    if not new_status:
        raise HTTPException(400, "status is required")

    result = await db.execute(select(Task).where(Task.id == task_id, Task.project_id == project_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(404, "Task not found")

    role = current_user.get("role", "fd")

    # Only the assigned role or admin/mgmt/ceo can update
    if role not in ("admin", "mgmt", "ceo") and task.assigned_role != role:
        raise HTTPException(403, "You are not assigned to this task")

    # Validate allowed statuses for this role
    allowed = ROLE_ALLOWED_STATUSES.get(role, ["in_progress", "completed"])
    if new_status not in allowed:
        raise HTTPException(403, f"Role '{role}' cannot set status '{new_status}'")

    old_status = task.status
    task.status = new_status

    proj_result = await db.execute(select(Project).where(Project.project_id == project_id))
    p = proj_result.scalars().first()

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="UPDATE",
        action_label=f"updated task '{task.title}' status: {old_status} → {new_status}",
        entity=project_id,
        involved_roles=f"admin,{role}",
        time_ago="just now",
    ))

    await notify_roles(
        db,
        roles=["admin", "mgmt"],
        title=f"Task Status Updated: {task.title}",
        message=f"{current_user.get('name','User')} ({role}) changed task '{task.title}' from '{old_status}' to '{new_status}' on {p.name if p else project_id}.",
        action_type="task_assigned",
        entity_id=project_id,
        entity_name=p.name if p else project_id,
        created_by=current_user.get("name", ""),
    )

    await db.commit()
    return {"ok": True, "task": _task_out(task)}


@router.get("/tasks/allowed-statuses")
async def get_allowed_statuses(
    current_user: dict = Depends(get_current_user),
):
    """Return the allowed task status transitions for the current user's role."""
    role = current_user.get("role", "fd")
    allowed = ROLE_ALLOWED_STATUSES.get(role, ["in_progress", "completed"])
    return {
        "role": role,
        "allowed_statuses": allowed,
        "labels": {s: STATUS_LABELS.get(s, s.replace("_", " ").title()) for s in allowed},
    }

