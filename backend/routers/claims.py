"""
Claim Substantiation router.
Roles: admin, sa, rd_head can create/update.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth import get_current_user
from orm_models import ClaimRecord, Project, AuditLog
from notify import notify_roles
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/claims", tags=["claims"])
ALLOWED_ROLES = {"admin", "sa", "rd_head", "regulatory"}
STATUS_LIST = ["Pending", "In Review", "Verified", "Rejected"]


class ClaimCreate(BaseModel):
    project_id: str
    claim_text: str
    evidence: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_role: Optional[str] = "sa"
    notes: Optional[str] = None


class ClaimUpdate(BaseModel):
    claim_text: Optional[str] = None
    evidence: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_role: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


def _out(c: ClaimRecord) -> dict:
    return {
        "id": c.id, "claim_id": c.claim_id, "project_id": c.project_id,
        "project_name": c.project_name, "claim_text": c.claim_text,
        "evidence": c.evidence, "assigned_to": c.assigned_to,
        "assigned_role": c.assigned_role, "status": c.status, "notes": c.notes,
        "created_by": c.created_by, "created_by_role": c.created_by_role,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


@router.get("")
async def list_claims(
    project_id: str = Query(""), status: str = Query("all"), q: str = Query(""),
    current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role", "fd")
    stmt = select(ClaimRecord)
    if project_id:
        stmt = stmt.where(ClaimRecord.project_id == project_id)
    if status != "all":
        stmt = stmt.where(ClaimRecord.status == status)
    if q:
        stmt = stmt.where(ClaimRecord.claim_text.ilike(f"%{q}%") | ClaimRecord.project_name.ilike(f"%{q}%"))
    if role not in ("admin", "mgmt", "ceo"):
        proj_stmt = select(Project.project_id).where(Project.teams_involved.contains(role))
        ids = [r[0] for r in (await db.execute(proj_stmt)).all()]
        stmt = stmt.where(ClaimRecord.project_id.in_(ids))
    stmt = stmt.order_by(ClaimRecord.updated_at.desc()).limit(200)
    result = await db.execute(stmt)
    return [_out(c) for c in result.scalars().all()]


@router.post("", status_code=201)
async def create_claim(body: ClaimCreate, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    role = current_user.get("role", "fd")
    if role not in ALLOWED_ROLES:
        raise HTTPException(403, "Only admin, sa, rd_head, regulatory can create claims")
    proj_result = await db.execute(select(Project).where(Project.project_id == body.project_id))
    project = proj_result.scalars().first()
    if not project:
        raise HTTPException(404, f"Project {body.project_id} not found")
    count = (await db.execute(select(func.count()).select_from(ClaimRecord).where(ClaimRecord.project_id == body.project_id))).scalar() or 0
    claim_id = f"CLM-{body.project_id}-{str(count + 1).zfill(2)}"
    claim = ClaimRecord(
        claim_id=claim_id, project_id=body.project_id, project_name=project.name,
        claim_text=body.claim_text, evidence=body.evidence,
        assigned_to=body.assigned_to, assigned_role=body.assigned_role or "sa",
        status="Pending", notes=body.notes,
        created_by=current_user.get("name", ""), created_by_role=role,
    )
    db.add(claim)
    db.add(AuditLog(user_name=current_user.get("name",""), user_email=current_user.get("sub",""),
        action="CREATE", action_label=f"created claim {claim_id} for {project.name}",
        entity=claim_id, involved_roles=project.teams_involved or "admin", time_ago="just now"))
    assigned = body.assigned_role or "sa"
    await notify_roles(db, roles=[assigned, "admin"],
        title=f"Claim Substantiation Task: {project.name}",
        message=f"{current_user.get('name','User')} assigned claim substantiation for '{body.claim_text[:60]}' on {project.name}.",
        action_type="task_assigned", entity_id=body.project_id, entity_name=project.name,
        created_by=current_user.get("name", ""))
    await db.commit()
    await db.refresh(claim)
    return _out(claim)


@router.put("/{claim_id}")
async def update_claim(claim_id: str, body: ClaimUpdate, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    role = current_user.get("role", "fd")
    result = await db.execute(select(ClaimRecord).where(ClaimRecord.claim_id == claim_id))
    c = result.scalars().first()
    if not c:
        raise HTTPException(404, "Claim not found")
    if role not in ("admin", "rd_head") and role != c.assigned_role:
        raise HTTPException(403, "You are not assigned to this claim")
    old_status = c.status
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(c, field, value)
    change = f"status → {body.status}" if body.status else "details updated"
    db.add(AuditLog(user_name=current_user.get("name",""), user_email=current_user.get("sub",""),
        action="UPDATE", action_label=f"updated claim {claim_id} — {change}",
        entity=claim_id, involved_roles="admin", time_ago="just now"))
    if body.status and body.status != old_status:
        proj_result = await db.execute(select(Project).where(Project.project_id == c.project_id))
        project = proj_result.scalars().first()
        teams = (project.teams_involved if project else "admin").split(",")
        await notify_roles(db, roles=teams, title=f"Claim Status Updated: {c.project_name}",
            message=f"{current_user.get('name','User')} updated claim {claim_id} — {change}.",
            action_type="info", entity_id=c.project_id, entity_name=c.project_name,
            created_by=current_user.get("name", ""))
    await db.commit()
    return {"ok": True}


@router.delete("/{claim_id}")
async def delete_claim(claim_id: str, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.get("role") not in ("admin",):
        raise HTTPException(403, "Only admin can delete claims")
    result = await db.execute(select(ClaimRecord).where(ClaimRecord.claim_id == claim_id))
    c = result.scalars().first()
    if not c:
        raise HTTPException(404, "Claim not found")
    await db.delete(c)
    await db.commit()
    return {"ok": True}
