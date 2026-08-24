"""
Costing & Packaging Feasibility router.
Roles: admin, packaging, rd_head, mgmt can create/update.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth import get_current_user
from orm_models import CostingRecord, Project, AuditLog
from notify import notify_roles
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/api/costing", tags=["costing"])
ALLOWED_ROLES = {"admin", "packaging", "rd_head", "mgmt"}


class CostItem(BaseModel):
    component: str
    pct: Optional[str] = None
    cost_inr: Optional[str] = None


class PackagingItem(BaseModel):
    item: str
    cost_per_unit: Optional[str] = None
    feasibility: Optional[str] = "Feasible"


class CostingCreate(BaseModel):
    project_id: str
    formula_id: Optional[str] = None
    cost_breakdown: Optional[List[dict]] = None
    total_cost_per_kg: Optional[str] = None
    packaging_items: Optional[List[dict]] = None
    notes: Optional[str] = None


class CostingUpdate(BaseModel):
    formula_id: Optional[str] = None
    cost_breakdown: Optional[List[dict]] = None
    total_cost_per_kg: Optional[str] = None
    packaging_items: Optional[List[dict]] = None
    status: Optional[str] = None
    notes: Optional[str] = None


def _out(c: CostingRecord) -> dict:
    return {
        "id": c.id, "cost_id": c.cost_id, "project_id": c.project_id,
        "project_name": c.project_name, "formula_id": c.formula_id,
        "cost_breakdown": c.cost_breakdown or [], "total_cost_per_kg": c.total_cost_per_kg,
        "packaging_items": c.packaging_items or [], "status": c.status, "notes": c.notes,
        "created_by": c.created_by, "created_by_role": c.created_by_role,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


@router.get("")
async def list_costing(
    project_id: str = Query(""), status: str = Query("all"),
    current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role", "fd")
    stmt = select(CostingRecord)
    if project_id:
        stmt = stmt.where(CostingRecord.project_id == project_id)
    if status != "all":
        stmt = stmt.where(CostingRecord.status == status)
    if role not in ("admin", "mgmt", "ceo"):
        proj_stmt = select(Project.project_id).where(Project.teams_involved.contains(role))
        ids = [r[0] for r in (await db.execute(proj_stmt)).all()]
        stmt = stmt.where(CostingRecord.project_id.in_(ids))
    stmt = stmt.order_by(CostingRecord.updated_at.desc()).limit(200)
    result = await db.execute(stmt)
    return [_out(c) for c in result.scalars().all()]


@router.post("", status_code=201)
async def create_costing(body: CostingCreate, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    role = current_user.get("role", "fd")
    if role not in ALLOWED_ROLES:
        raise HTTPException(403, "Only admin, packaging, rd_head, mgmt can create costing records")
    proj_result = await db.execute(select(Project).where(Project.project_id == body.project_id))
    project = proj_result.scalars().first()
    if not project:
        raise HTTPException(404, f"Project {body.project_id} not found")
    count = (await db.execute(select(func.count()).select_from(CostingRecord).where(CostingRecord.project_id == body.project_id))).scalar() or 0
    cost_id = f"CST-{body.project_id}-{str(count + 1).zfill(2)}"
    rec = CostingRecord(
        cost_id=cost_id, project_id=body.project_id, project_name=project.name,
        formula_id=body.formula_id, cost_breakdown=body.cost_breakdown or [],
        total_cost_per_kg=body.total_cost_per_kg, packaging_items=body.packaging_items or [],
        status="Draft", notes=body.notes,
        created_by=current_user.get("name", ""), created_by_role=role,
    )
    db.add(rec)
    db.add(AuditLog(user_name=current_user.get("name",""), user_email=current_user.get("sub",""),
        action="CREATE", action_label=f"created costing record {cost_id} for {project.name}",
        entity=cost_id, involved_roles=project.teams_involved or "admin", time_ago="just now"))
    teams = (project.teams_involved or "admin").split(",")
    await notify_roles(db, roles=teams, title=f"Costing Record Created: {project.name}",
        message=f"{current_user.get('name','User')} created costing record {cost_id} for {project.name}.",
        action_type="info", entity_id=body.project_id, entity_name=project.name,
        created_by=current_user.get("name", ""))
    await db.commit()
    await db.refresh(rec)
    return _out(rec)


@router.put("/{cost_id}")
async def update_costing(cost_id: str, body: CostingUpdate, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    role = current_user.get("role", "fd")
    if role not in ALLOWED_ROLES:
        raise HTTPException(403, "Only admin, packaging, rd_head, mgmt can update costing")
    result = await db.execute(select(CostingRecord).where(CostingRecord.cost_id == cost_id))
    c = result.scalars().first()
    if not c:
        raise HTTPException(404, "Costing record not found")
    old_status = c.status
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(c, field, value)
    change = f"status → {body.status}" if body.status else "details updated"
    db.add(AuditLog(user_name=current_user.get("name",""), user_email=current_user.get("sub",""),
        action="UPDATE", action_label=f"updated costing {cost_id} — {change}",
        entity=cost_id, involved_roles="admin", time_ago="just now"))
    if body.status and body.status != old_status:
        proj_result = await db.execute(select(Project).where(Project.project_id == c.project_id))
        project = proj_result.scalars().first()
        teams = (project.teams_involved if project else "admin").split(",")
        await notify_roles(db, roles=teams, title=f"Costing Updated: {c.project_name}",
            message=f"{current_user.get('name','User')} updated {cost_id} — {change}.",
            action_type="info", entity_id=c.project_id, entity_name=c.project_name,
            created_by=current_user.get("name", ""))
    await db.commit()
    return {"ok": True}


@router.delete("/{cost_id}")
async def delete_costing(cost_id: str, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.get("role") not in ("admin",):
        raise HTTPException(403, "Only admin can delete costing records")
    result = await db.execute(select(CostingRecord).where(CostingRecord.cost_id == cost_id))
    c = result.scalars().first()
    if not c:
        raise HTTPException(404, "Record not found")
    await db.delete(c)
    await db.commit()
    return {"ok": True}
