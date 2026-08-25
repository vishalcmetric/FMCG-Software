"""
Sensory & Analytical Evaluation router.
Roles: admin, pmsa, adl, rd_head can create/update.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth import get_current_user
from orm_models import SensoryEvaluation, PPDSubmission, AuditLog
from notify import notify_roles
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/sensory", tags=["sensory"])
ALLOWED_ROLES = {"admin", "pmsa", "adl", "rd_head"}
ALL_ROLES = "admin,source,pm,fd,rd_head,marketing,regulatory,packaging,adl,pmsa,sa,mgmt,ceo,production"


class SensoryCreate(BaseModel):
    ppd_id: str
    formula_id: Optional[str] = None
    panel_size: Optional[int] = 0
    eval_date: Optional[str] = None
    overall_score: Optional[str] = None
    aroma: Optional[str] = None
    taste: Optional[str] = None
    mouthfeel: Optional[str] = None
    aftertaste: Optional[str] = None
    adl_protein_pct: Optional[str] = None
    adl_fat_pct: Optional[str] = None
    adl_moisture: Optional[str] = None
    adl_ash: Optional[str] = None
    adl_apc: Optional[str] = None
    adl_ecoli: Optional[str] = None
    notes: Optional[str] = None


class SensoryUpdate(BaseModel):
    formula_id: Optional[str] = None
    panel_size: Optional[int] = None
    eval_date: Optional[str] = None
    overall_score: Optional[str] = None
    aroma: Optional[str] = None
    taste: Optional[str] = None
    mouthfeel: Optional[str] = None
    aftertaste: Optional[str] = None
    adl_protein_pct: Optional[str] = None
    adl_fat_pct: Optional[str] = None
    adl_moisture: Optional[str] = None
    adl_ash: Optional[str] = None
    adl_apc: Optional[str] = None
    adl_ecoli: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


def _out(e: SensoryEvaluation) -> dict:
    return {
        "id": e.id, "eval_id": e.eval_id, "ppd_id": e.ppd_id,
        "project_name": e.project_name, "formula_id": e.formula_id,
        "panel_size": e.panel_size, "eval_date": e.eval_date,
        "overall_score": e.overall_score, "aroma": e.aroma, "taste": e.taste,
        "mouthfeel": e.mouthfeel, "aftertaste": e.aftertaste,
        "adl_protein_pct": e.adl_protein_pct, "adl_fat_pct": e.adl_fat_pct,
        "adl_moisture": e.adl_moisture, "adl_ash": e.adl_ash,
        "adl_apc": e.adl_apc, "adl_ecoli": e.adl_ecoli,
        "status": e.status, "notes": e.notes,
        "created_by": e.created_by, "created_by_role": e.created_by_role,
        "created_at": e.created_at.isoformat() if e.created_at else None,
        "updated_at": e.updated_at.isoformat() if e.updated_at else None,
    }


@router.get("")
async def list_evals(
    ppd_id: str = Query(""), status: str = Query("all"), q: str = Query(""),
    current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    stmt = select(SensoryEvaluation)
    if ppd_id:
        stmt = stmt.where(SensoryEvaluation.ppd_id == ppd_id)
    if status != "all":
        stmt = stmt.where(SensoryEvaluation.status == status)
    if q:
        stmt = stmt.where(SensoryEvaluation.project_name.ilike(f"%{q}%"))
    stmt = stmt.order_by(SensoryEvaluation.updated_at.desc()).limit(200)
    result = await db.execute(stmt)
    return [_out(e) for e in result.scalars().all()]


@router.post("", status_code=201)
async def create_eval(body: SensoryCreate, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    role = current_user.get("role", "fd")
    if role not in ALLOWED_ROLES:
        raise HTTPException(403, "Only admin, pmsa, adl, rd_head can create evaluations")
    ppd_result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == body.ppd_id))
    ppd = ppd_result.scalars().first()
    if not ppd:
        raise HTTPException(404, f"PPD {body.ppd_id} not found")
    seq = ((await db.execute(select(func.count()).select_from(SensoryEvaluation).where(SensoryEvaluation.ppd_id == body.ppd_id))).scalar() or 0) + 1
    while (await db.execute(select(SensoryEvaluation.id).where(SensoryEvaluation.eval_id == f"SE-{body.ppd_id}-{str(seq).zfill(2)}"))).scalar():
        seq += 1
    eval_id = f"SE-{body.ppd_id}-{str(seq).zfill(2)}"
    ev = SensoryEvaluation(
        eval_id=eval_id, ppd_id=body.ppd_id, project_name=ppd.project_name,
        formula_id=body.formula_id, panel_size=body.panel_size or 0,
        eval_date=body.eval_date, overall_score=body.overall_score, aroma=body.aroma,
        taste=body.taste, mouthfeel=body.mouthfeel, aftertaste=body.aftertaste,
        adl_protein_pct=body.adl_protein_pct, adl_fat_pct=body.adl_fat_pct,
        adl_moisture=body.adl_moisture, adl_ash=body.adl_ash,
        adl_apc=body.adl_apc, adl_ecoli=body.adl_ecoli,
        status="Pending", notes=body.notes,
        created_by=current_user.get("name", ""), created_by_role=role,
    )
    db.add(ev)
    db.add(AuditLog(user_name=current_user.get("name",""), user_email=current_user.get("sub",""),
        action="CREATE", action_label=f"created sensory evaluation {eval_id} for {ppd.project_name}",
        entity=eval_id, involved_roles=ppd.teams_involved or ALL_ROLES, time_ago="just now"))
    teams = (ppd.teams_involved or ALL_ROLES).split(",")
    await notify_roles(db, roles=teams, title=f"Sensory Evaluation Submitted: {ppd.project_name}",
        message=f"{current_user.get('name','User')} submitted sensory evaluation {eval_id} for {ppd.project_name}.",
        action_type="info", entity_id=body.ppd_id, entity_name=ppd.project_name,
        created_by=current_user.get("name", ""))
    await db.commit()
    await db.refresh(ev)
    return _out(ev)


@router.put("/{eval_id}")
async def update_eval(eval_id: str, body: SensoryUpdate, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    role = current_user.get("role", "fd")
    if role not in ALLOWED_ROLES:
        raise HTTPException(403, "Only admin, pmsa, adl, rd_head can update evaluations")
    result = await db.execute(select(SensoryEvaluation).where(SensoryEvaluation.eval_id == eval_id))
    e = result.scalars().first()
    if not e:
        raise HTTPException(404, "Evaluation not found")
    old_status = e.status
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(e, field, value)
    change = f"status → {body.status}" if body.status else "details updated"
    db.add(AuditLog(user_name=current_user.get("name",""), user_email=current_user.get("sub",""),
        action="UPDATE", action_label=f"updated sensory eval {eval_id} — {change}",
        entity=eval_id, involved_roles="admin", time_ago="just now"))
    if body.status and body.status != old_status:
        ppd_result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == e.ppd_id))
        ppd = ppd_result.scalars().first()
        teams = (ppd.teams_involved if ppd else ALL_ROLES).split(",")
        await notify_roles(db, roles=teams, title=f"Sensory Result Updated: {e.project_name}",
            message=f"{current_user.get('name','User')} updated {eval_id} — {change}.",
            action_type="info", entity_id=e.ppd_id, entity_name=e.project_name,
            created_by=current_user.get("name", ""))
    await db.commit()
    return {"ok": True}


@router.delete("/{eval_id}")
async def delete_eval(eval_id: str, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.get("role") not in ("admin",):
        raise HTTPException(403, "Only admin can delete evaluations")
    result = await db.execute(select(SensoryEvaluation).where(SensoryEvaluation.eval_id == eval_id))
    e = result.scalars().first()
    if not e:
        raise HTTPException(404, "Evaluation not found")
    await db.delete(e)
    await db.commit()
    return {"ok": True}
