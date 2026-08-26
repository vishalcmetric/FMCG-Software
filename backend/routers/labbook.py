"""
E-Lab Notebook router.
Roles: admin, fd, rd_head, adl can create/update.
Any role can view.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db, fmt_ist
from auth import get_current_user
from orm_models import LabExperiment, PPDSubmission, AuditLog
from notify import notify_roles
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/labbook", tags=["labbook"])
ALLOWED_ROLES = {"admin", "fd", "rd_head", "adl"}
ALL_ROLES = "admin,source,pm,fd,rd_head,marketing,regulatory,packaging,adl,pmsa,sa,mgmt,ceo,production"


class ExperimentCreate(BaseModel):
    ppd_id: str
    title: str
    batch_no: Optional[str] = None
    temperature: Optional[str] = None
    duration: Optional[str] = None
    observations: Optional[str] = None
    result: Optional[str] = None
    formula_id: Optional[str] = None
    version: Optional[str] = None


class ExperimentUpdate(BaseModel):
    title: Optional[str] = None
    batch_no: Optional[str] = None
    temperature: Optional[str] = None
    duration: Optional[str] = None
    observations: Optional[str] = None
    result: Optional[str] = None
    status: Optional[str] = None
    formula_id: Optional[str] = None
    version: Optional[str] = None


def _out(e: LabExperiment) -> dict:
    return {
        "id": e.id, "exp_id": e.exp_id, "ppd_id": e.ppd_id,
        "project_name": e.project_name, "title": e.title, "batch_no": e.batch_no,
        "temperature": e.temperature, "duration": e.duration,
        "observations": e.observations, "result": e.result, "status": e.status,
        "formula_id": e.formula_id or "", "version": e.version or "",
        "created_by": e.created_by, "created_by_role": e.created_by_role,
        "created_at": fmt_ist(e.created_at),
        "updated_at": fmt_ist(e.updated_at),
    }


@router.get("")
async def list_experiments(
    ppd_id: str = Query(""),
    q: str = Query(""),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(LabExperiment)
    if ppd_id:
        stmt = stmt.where(LabExperiment.ppd_id == ppd_id)
    if q:
        stmt = stmt.where(LabExperiment.title.ilike(f"%{q}%") | LabExperiment.exp_id.ilike(f"%{q}%"))
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
    ppd_result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == body.ppd_id))
    ppd = ppd_result.scalars().first()
    if not ppd:
        raise HTTPException(404, f"PPD {body.ppd_id} not found")
    seq = ((await db.execute(select(func.count()).select_from(LabExperiment).where(LabExperiment.ppd_id == body.ppd_id))).scalar() or 0) + 1
    while (await db.execute(select(LabExperiment.id).where(LabExperiment.exp_id == f"EXP-{body.ppd_id}-{str(seq).zfill(2)}"))).scalar():
        seq += 1
    exp_id = f"EXP-{body.ppd_id}-{str(seq).zfill(2)}"
    exp = LabExperiment(
        exp_id=exp_id, ppd_id=body.ppd_id, project_name=ppd.project_name,
        title=body.title, batch_no=body.batch_no, temperature=body.temperature,
        duration=body.duration, observations=body.observations, result=body.result,
        formula_id=body.formula_id, version=body.version,
        status="Active", created_by=current_user.get("name", ""), created_by_role=role,
    )
    db.add(exp)
    db.add(AuditLog(user_name=current_user.get("name",""), user_email=current_user.get("sub",""),
        action="CREATE", action_label=f"created experiment {exp_id}: {body.title}",
        entity=exp_id, involved_roles=ppd.teams_involved or ALL_ROLES, time_ago="just now"))
    teams = (ppd.teams_involved or ALL_ROLES).split(",")
    await notify_roles(db, roles=teams,
        title=f"Lab Experiment Added: {ppd.project_name}",
        message=f"{current_user.get('name','User')} created experiment {exp_id} ({body.title}) on {ppd.project_name}.",
        action_type="info", entity_id=body.ppd_id, entity_name=ppd.project_name,
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
        involved_roles=ALL_ROLES, time_ago="just now"))
    ppd_result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == e.ppd_id))
    ppd = ppd_result.scalars().first()
    if ppd:
        teams = (ppd.teams_involved or ALL_ROLES).split(",")
        await notify_roles(db, roles=teams,
            title=f"Lab Experiment Updated: {e.project_name}",
            message=f"{current_user.get('name','User')} updated experiment {exp_id} — {change}.",
            action_type="info", entity_id=e.ppd_id, entity_name=e.project_name,
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
