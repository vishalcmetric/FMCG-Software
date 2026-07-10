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
from models import ProjectCreate, ProjectUpdate
from orm_models import Project, AuditLog
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
    pid = f"ZW-{year}-{str(count + 1).zfill(3)}"

    role = current_user.get("role", "fd")

    # Admin-created projects are visible to ALL roles by default
    if role == "admin":
        teams = ALL_ROLES
    elif body.teams_involved:
        # Caller explicitly set teams — ensure admin is always in
        teams_list = list(dict.fromkeys(["admin"] + body.teams_involved))
        teams = ",".join(teams_list)
    else:
        teams = f"admin,{role}"

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
    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="CREATE",
        action_label=f"created new project: {body.name}",
        entity=body.name,
        involved_roles="admin",
        time_ago="just now",
    ))

    # Notify all roles that a new project was added by admin
    target_roles = teams.split(",") if teams != ALL_ROLES else ["all"]
    await notify_roles(
        db,
        roles=target_roles,
        title=f"New Project: {body.name}",
        message=f"{current_user.get('name','Admin')} created project {pid} ({body.brand} • {body.type}). Priority: {body.priority}.",
        action_type="project_created",
        entity_id=pid,
        entity_name=body.name,
        created_by=current_user.get("name", "Admin"),
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
