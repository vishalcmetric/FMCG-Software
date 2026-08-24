"""
E-Lab Notebook router.
Roles: admin, fd, rd_head, adl can create/update.
Any role in teams_involved can view.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth import get_current_user
from orm_models import LabExperiment, Project, AuditLog
from notify import notify_roles
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/labbook", tags=["labbook"])
ALLOWED_ROLES = {"admin", "fd", "rd_head", "adl"}


class ExperimentCreate(BaseModel):
    project_id: str
    title: str
    batch_no: Optional[str] = None
    temperature: Optional[str] = None
    duration: Optional[str] = None
    observations: Optional[str] = None
    result: Optional[str] = None


class ExperimentUpdate(BaseModel):
    title: Optional[str] = None
    batch_no: Optional[str] = None
    temperature: Optional[str] = None
    duration: Optional[str] = None
    observations: Optional[str] = None
    result: Optional[str] = None
    status: Optional[str] = None


def _out(e: LabExperiment) -> dict:
    return {
        "id": e.id, "exp_id": e.exp_id, "project_id": e.project_id,
        "project_name": e.project_name, "title": e.title, "batch_no": e.batch_no,
        "temperature": e.temperature, "duration": e.duration,
        "observations": e.observations, "result": e.result, "status": e.status,
        "created_by": e.created_by, "created_by_role": e.created_by_role,
        "created_at": e.created_at.isoformat() if e.created_at else None,
        "updated_at": e.updated_at.isoformat() if e.updated_at else None,
    }


@router.get("")
async def list_experiments(
    project_id: str = Query(""),
    q: str = Query(""),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role", "fd")
    stmt = select(LabExperiment)
    if project_id:
        stmt = stmt.where(LabExperiment.project_id == project_id)
    if q:
        stmt = stmt.where(LabExperiment.title.ilike(f"%{q}%") | LabExperiment.exp_id.ilike(f"%{q}%"))
    if role not in ("admin", "mgmt", "ceo"):
        proj_stmt = select(Project.project_id).where(Project.teams_involved.contains(role))
        ids = [r[0] for r in (await db.execute(proj_stmt)).all()]
        stmt = stmt.where(LabExperiment.project_id.in_(ids))
    stmt = stmt.order_by(LabExperiment.updated_at.desc()).limit(200)
    result = await db.execute(stmt)
    return [_out(e) for e in result.scalars().all()]


@router.get("/{exp_id}")
async def get_experiment(exp_id: str, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LabExperiment).where(LabExperiment.exp_id == exp_id))
    e = result.scalars().first()
    if not e:
        raise HTTPException(404, "Experiment not found")
    return _out(e)


@router.post("", status_code=201)
async def create_experiment(body: ExperimentCreate, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    role = current_user.get("role", "fd")
    if role not in ALLOWED_ROLES:
        raise HTTPException(403, "Only admin, fd, rd_head, adl can create experiments")
    proj_result = await db.execute(select(Project).where(Project.project_id == body.project_id))
    project = proj_result.scalars().first()
    if not project:
        raise HTTPException(404, f"Project {body.project_id} not found")
    count = (await db.execute(select(func.count()).select_from(LabExperiment).where(LabExperiment.project_id == body.project_id))).scalar() or 0
    exp_id = f"EXP-{body.project_id}-{str(count + 1).zfill(2)}"
    exp = LabExperiment(
        exp_id=exp_id, project_id=body.project_id, project_name=project.name,
        title=body.title, batch_no=body.batch_no, temperature=body.temperature,
        duration=body.duration, observations=body.observations, result=body.result,
        status="Active", created_by=current_user.get("name", ""), created_by_role=role,
    )
    db.add(exp)
    db.add(AuditLog(user_name=current_user.get("name",""), user_email=current_user.get("sub",""),
        action="CREATE", action_label=f"created experiment {exp_id}: {body.title}",
        entity=exp_id, involved_roles=project.teams_involved or "admin", time_ago="just now"))
    teams = (project.teams_involved or "admin").split(",")
    await notify_roles(db, roles=teams,
        title=f"Lab Experiment Added: {project.name}",
        message=f"{current_user.get('name','User')} created experiment {exp_id} ({body.title}) on {project.name}.",
        action_type="project_updated", entity_id=body.project_id, entity_name=project.name,
        created_by=current_user.get("name", ""))
    await db.commit()
    await db.refresh(exp)
    return _out(exp)


@router.put("/{exp_id}")
async def update_experiment(exp_id: str, body: ExperimentUpdate, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    role = current_user.get("role", "fd")
    if role not in ALLOWED_ROLES:
        raise HTTPException(403, "Only admin, fd, rd_head, adl can update experiments")
    result = await db.execute(select(LabExperiment).where(LabExperiment.exp_id == exp_id))
    e = result.scalars().first()
    if not e:
        raise HTTPException(404, "Experiment not found")
    old_status = e.status
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(e, field, value)
    change = f"status → {body.status}" if body.status and body.status != old_status else "details updated"
    db.add(AuditLog(user_name=current_user.get("name",""), user_email=current_user.get("sub",""),
        action="UPDATE", action_label=f"updated experiment {exp_id} — {change}", entity=exp_id,
        involved_roles="admin,fd,rd_head,adl", time_ago="just now"))
    # Notify all roles working on this project
    proj_result = await db.execute(select(Project).where(Project.project_id == e.project_id))
    proj = proj_result.scalars().first()
    if proj:
        teams = (proj.teams_involved or "admin").split(",")
        await notify_roles(db, roles=teams,
            title=f"Lab Experiment Updated: {e.project_name}",
            message=f"{current_user.get('name','User')} updated experiment {exp_id} — {change}.",
            action_type="project_updated", entity_id=e.project_id, entity_name=e.project_name,
            created_by=current_user.get("name", ""))
    await db.commit()
    return {"ok": True}


@router.delete("/{exp_id}")
async def delete_experiment(exp_id: str, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.get("role") not in ("admin", "rd_head"):
        raise HTTPException(403, "Only admin or rd_head can delete experiments")
    result = await db.execute(select(LabExperiment).where(LabExperiment.exp_id == exp_id))
    e = result.scalars().first()
    if not e:
        raise HTTPException(404, "Experiment not found")
    await db.delete(e)
    await db.commit()
    return {"ok": True}
