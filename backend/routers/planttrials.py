"""
Plant Trials router.
Roles: admin, production, rd_head, packaging can create/update.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth import get_current_user
from orm_models import PlantTrial, Project, AuditLog
from notify import notify_roles
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/api/planttrials", tags=["planttrials"])
ALLOWED_ROLES = {"admin", "production", "rd_head", "packaging"}


class TrialCreate(BaseModel):
    project_id: str
    plant_location: Optional[str] = None
    batch_size: Optional[str] = None
    stage: Optional[str] = "Pilot"
    bom_code: Optional[str] = None
    mfc_code: Optional[str] = None
    product_code: Optional[str] = None
    sfg_code: Optional[str] = None
    notes: Optional[str] = None
    scheduled_date: Optional[str] = None


class TrialUpdate(BaseModel):
    plant_location: Optional[str] = None
    batch_size: Optional[str] = None
    stage: Optional[str] = None
    status: Optional[str] = None
    bom_code: Optional[str] = None
    mfc_code: Optional[str] = None
    product_code: Optional[str] = None
    sfg_code: Optional[str] = None
    notes: Optional[str] = None
    scheduled_date: Optional[str] = None
    completed_date: Optional[str] = None


def _out(t: PlantTrial) -> dict:
    return {
        "id": t.id, "trial_id": t.trial_id, "project_id": t.project_id,
        "project_name": t.project_name, "plant_location": t.plant_location,
        "batch_size": t.batch_size, "stage": t.stage, "status": t.status,
        "bom_code": t.bom_code, "mfc_code": t.mfc_code,
        "product_code": t.product_code, "sfg_code": t.sfg_code, "notes": t.notes,
        "scheduled_date": t.scheduled_date, "completed_date": t.completed_date,
        "created_by": t.created_by, "created_by_role": t.created_by_role,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


@router.get("")
async def list_trials(
    project_id: str = Query(""), status: str = Query("all"), q: str = Query(""),
    current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role", "fd")
    stmt = select(PlantTrial)
    if project_id:
        stmt = stmt.where(PlantTrial.project_id == project_id)
    if status != "all":
        stmt = stmt.where(PlantTrial.status == status)
    if q:
        stmt = stmt.where(PlantTrial.project_name.ilike(f"%{q}%") | PlantTrial.trial_id.ilike(f"%{q}%"))
    if role not in ("admin", "mgmt", "ceo"):
        proj_stmt = select(Project.project_id).where(Project.teams_involved.contains(role))
        ids = [r[0] for r in (await db.execute(proj_stmt)).all()]
        stmt = stmt.where(PlantTrial.project_id.in_(ids))
    stmt = stmt.order_by(PlantTrial.updated_at.desc()).limit(200)
    result = await db.execute(stmt)
    return [_out(t) for t in result.scalars().all()]


@router.post("", status_code=201)
async def create_trial(body: TrialCreate, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    role = current_user.get("role", "fd")
    if role not in ALLOWED_ROLES:
        raise HTTPException(403, "Only admin, production, rd_head, packaging can create trials")
    proj_result = await db.execute(select(Project).where(Project.project_id == body.project_id))
    project = proj_result.scalars().first()
    if not project:
        raise HTTPException(404, f"Project {body.project_id} not found")
    count = (await db.execute(select(func.count()).select_from(PlantTrial).where(PlantTrial.project_id == body.project_id))).scalar() or 0
    trial_id = f"PT-{body.project_id}-{str(count + 1).zfill(2)}"
    trial = PlantTrial(
        trial_id=trial_id, project_id=body.project_id, project_name=project.name,
        plant_location=body.plant_location, batch_size=body.batch_size, stage=body.stage or "Pilot",
        status="Scheduled", bom_code=body.bom_code, mfc_code=body.mfc_code,
        product_code=body.product_code, sfg_code=body.sfg_code, notes=body.notes,
        scheduled_date=body.scheduled_date, created_by=current_user.get("name", ""), created_by_role=role,
    )
    db.add(trial)
    db.add(AuditLog(user_name=current_user.get("name",""), user_email=current_user.get("sub",""),
        action="CREATE", action_label=f"scheduled plant trial {trial_id} for {project.name}",
        entity=trial_id, involved_roles=project.teams_involved or "admin", time_ago="just now"))
    target_roles = (project.teams_involved or "admin").split(",")
    await notify_roles(db, roles=target_roles, title=f"Plant Trial Scheduled: {project.name}",
        message=f"{current_user.get('name','User')} scheduled trial {trial_id} ({body.stage or 'Pilot'}) for {project.name}.",
        action_type="info", entity_id=body.project_id, entity_name=project.name,
        created_by=current_user.get("name", ""))
    await db.commit()
    await db.refresh(trial)
    return _out(trial)


@router.put("/{trial_id}")
async def update_trial(trial_id: str, body: TrialUpdate, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    role = current_user.get("role", "fd")
    if role not in ALLOWED_ROLES:
        raise HTTPException(403, "Only admin, production, rd_head, packaging can update trials")
    result = await db.execute(select(PlantTrial).where(PlantTrial.trial_id == trial_id))
    t = result.scalars().first()
    if not t:
        raise HTTPException(404, "Trial not found")
    updates = body.model_dump(exclude_none=True)
    for field, value in updates.items():
        setattr(t, field, value)
    change = updates.get("status", "details updated")
    db.add(AuditLog(user_name=current_user.get("name",""), user_email=current_user.get("sub",""),
        action="UPDATE", action_label=f"updated plant trial {trial_id} — {change}",
        entity=trial_id, involved_roles="admin", time_ago="just now"))
    # Notify all roles when status changes
    if "status" in updates:
        proj_result = await db.execute(select(Project).where(Project.project_id == t.project_id))
        project = proj_result.scalars().first()
        teams = (project.teams_involved if project else "admin").split(",")
        await notify_roles(db, roles=teams, title=f"Plant Trial Updated: {t.project_name}",
            message=f"{current_user.get('name','User')} updated trial {trial_id} — status → {updates['status']}.",
            action_type="info", entity_id=t.project_id, entity_name=t.project_name,
            created_by=current_user.get("name", ""))
    await db.commit()
    return {"ok": True}


@router.delete("/{trial_id}")
async def delete_trial(trial_id: str, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.get("role") not in ("admin",):
        raise HTTPException(403, "Only admin can delete trials")
    result = await db.execute(select(PlantTrial).where(PlantTrial.trial_id == trial_id))
    t = result.scalars().first()
    if not t:
        raise HTTPException(404, "Trial not found")
    await db.delete(t)
    await db.commit()
    return {"ok": True}
