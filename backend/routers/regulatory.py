"""
Regulatory Compliance router.
Roles: admin, regulatory, rd_head can create/update.
Status changes visible to all roles in the project.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth import get_current_user
from orm_models import RegulatoryCheck, Project, AuditLog
from notify import notify_roles
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/regulatory", tags=["regulatory"])
ALLOWED_ROLES = {"admin", "regulatory", "rd_head"}
STATUS_LIST = ["Pending", "Under Review", "Approved", "Rework Required"]


class RegCreate(BaseModel):
    project_id: str
    check_type: str
    ingredient_or_claim: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_role: Optional[str] = "regulatory"
    due_date: Optional[str] = None
    notes: Optional[str] = None


class RegUpdate(BaseModel):
    check_type: Optional[str] = None
    ingredient_or_claim: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_role: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


def _out(r: RegulatoryCheck) -> dict:
    return {
        "id": r.id, "reg_id": r.reg_id, "project_id": r.project_id,
        "project_name": r.project_name, "check_type": r.check_type,
        "ingredient_or_claim": r.ingredient_or_claim, "assigned_to": r.assigned_to,
        "assigned_role": r.assigned_role, "due_date": r.due_date, "status": r.status,
        "notes": r.notes, "created_by": r.created_by, "created_by_role": r.created_by_role,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


@router.get("")
async def list_checks(
    project_id: str = Query(""), status: str = Query("all"), q: str = Query(""),
    current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role", "fd")
    stmt = select(RegulatoryCheck)
    if project_id:
        stmt = stmt.where(RegulatoryCheck.project_id == project_id)
    if status != "all":
        stmt = stmt.where(RegulatoryCheck.status == status)
    if q:
        stmt = stmt.where(RegulatoryCheck.project_name.ilike(f"%{q}%") | RegulatoryCheck.check_type.ilike(f"%{q}%"))
    if role not in ("admin", "mgmt", "ceo"):
        proj_stmt = select(Project.project_id).where(Project.teams_involved.contains(role))
        ids = [r[0] for r in (await db.execute(proj_stmt)).all()]
        stmt = stmt.where(RegulatoryCheck.project_id.in_(ids))
    stmt = stmt.order_by(RegulatoryCheck.updated_at.desc()).limit(200)
    result = await db.execute(stmt)
    return [_out(r) for r in result.scalars().all()]


@router.post("", status_code=201)
async def create_check(body: RegCreate, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    role = current_user.get("role", "fd")
    if role not in ALLOWED_ROLES:
        raise HTTPException(403, "Only admin, regulatory, rd_head can create regulatory checks")
    proj_result = await db.execute(select(Project).where(Project.project_id == body.project_id))
    project = proj_result.scalars().first()
    if not project:
        raise HTTPException(404, f"Project {body.project_id} not found")
    count = (await db.execute(select(func.count()).select_from(RegulatoryCheck).where(RegulatoryCheck.project_id == body.project_id))).scalar() or 0
    reg_id = f"REG-{body.project_id}-{str(count + 1).zfill(2)}"
    check = RegulatoryCheck(
        reg_id=reg_id, project_id=body.project_id, project_name=project.name,
        check_type=body.check_type, ingredient_or_claim=body.ingredient_or_claim,
        assigned_to=body.assigned_to, assigned_role=body.assigned_role or "regulatory",
        due_date=body.due_date, status="Pending", notes=body.notes,
        created_by=current_user.get("name", ""), created_by_role=role,
    )
    db.add(check)
    db.add(AuditLog(user_name=current_user.get("name",""), user_email=current_user.get("sub",""),
        action="CREATE", action_label=f"created regulatory check {reg_id} for {project.name}",
        entity=reg_id, involved_roles=project.teams_involved or "admin", time_ago="just now"))
    # Notify the assigned role
    assigned = body.assigned_role or "regulatory"
    await notify_roles(db, roles=[assigned, "admin"],
        title=f"Regulatory Check Assigned: {project.name}",
        message=f"{current_user.get('name','User')} created {body.check_type} check for {project.name}. Assigned to {body.assigned_to or assigned}. Due: {body.due_date or 'TBD'}.",
        action_type="task_assigned", entity_id=body.project_id, entity_name=project.name,
        created_by=current_user.get("name", ""))
    await db.commit()
    await db.refresh(check)
    return _out(check)


@router.put("/{reg_id}")
async def update_check(reg_id: str, body: RegUpdate, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    role = current_user.get("role", "fd")
    result = await db.execute(select(RegulatoryCheck).where(RegulatoryCheck.reg_id == reg_id))
    r = result.scalars().first()
    if not r:
        raise HTTPException(404, "Regulatory check not found")
    # Only assigned role, admin, or rd_head can update
    if role not in ("admin", "rd_head") and role != r.assigned_role:
        raise HTTPException(403, "You are not assigned to this regulatory check")
    updates = body.model_dump(exclude_none=True)
    old_status = r.status
    for field, value in updates.items():
        setattr(r, field, value)
    change = f"status → {updates['status']}" if "status" in updates else "details updated"
    db.add(AuditLog(user_name=current_user.get("name",""), user_email=current_user.get("sub",""),
        action="UPDATE", action_label=f"updated regulatory check {reg_id} — {change}",
        entity=reg_id, involved_roles="admin", time_ago="just now"))
    # Notify admin + all project teams on status change
    if "status" in updates and updates["status"] != old_status:
        proj_result = await db.execute(select(Project).where(Project.project_id == r.project_id))
        project = proj_result.scalars().first()
        teams = (project.teams_involved if project else "admin").split(",")
        await notify_roles(db, roles=teams,
            title=f"Regulatory Status Update: {r.project_name}",
            message=f"{current_user.get('name','User')} updated {reg_id} ({r.check_type}) — {change}.",
            action_type="info", entity_id=r.project_id, entity_name=r.project_name,
            created_by=current_user.get("name", ""))
    await db.commit()
    return {"ok": True}


@router.delete("/{reg_id}")
async def delete_check(reg_id: str, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.get("role") not in ("admin",):
        raise HTTPException(403, "Only admin can delete regulatory checks")
    result = await db.execute(select(RegulatoryCheck).where(RegulatoryCheck.reg_id == reg_id))
    r = result.scalars().first()
    if not r:
        raise HTTPException(404, "Check not found")
    await db.delete(r)
    await db.commit()
    return {"ok": True}
