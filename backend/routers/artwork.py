"""
Artwork Management router.
Marketing creates briefs, Packaging manages design versions & approvals.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth import get_current_user
from orm_models import ArtworkBrief, Project, AuditLog
from notify import notify_roles
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/artwork", tags=["artwork"])

# Who can create a brief: marketing, packaging, admin
CREATE_ROLES = {"admin", "marketing", "packaging", "rd_head"}
# Who can update status / upload design: packaging, admin
UPDATE_ROLES = {"admin", "packaging", "marketing"}

ART_STATUSES = [
    "Brief Pending", "Design In Progress", "Under Review", "Approved", "Rework", "Rejected"
]
ART_TYPES = ["Label", "Carton", "Pouch", "Shipper", "Digital Banner", "POS Material"]


class ArtworkCreate(BaseModel):
    project_id: str
    artwork_type: Optional[str] = "Label"
    sku: Optional[str] = None
    brief_notes: Optional[str] = None
    design_link: Optional[str] = None
    assigned_to: Optional[str] = None


class ArtworkUpdate(BaseModel):
    artwork_type: Optional[str] = None
    sku: Optional[str] = None
    brief_notes: Optional[str] = None
    design_link: Optional[str] = None
    assigned_to: Optional[str] = None
    comment: Optional[str] = None
    status: Optional[str] = None
    version: Optional[str] = None


def _out(a: ArtworkBrief) -> dict:
    return {
        "id": a.id, "artwork_id": a.artwork_id, "project_id": a.project_id,
        "project_name": a.project_name, "brand": a.brand, "version": a.version,
        "artwork_type": a.artwork_type, "sku": a.sku, "brief_notes": a.brief_notes,
        "design_link": a.design_link, "comment": a.comment, "status": a.status,
        "assigned_to": a.assigned_to,
        "created_by": a.created_by, "created_by_role": a.created_by_role,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }


@router.get("")
async def list_artwork(
    project_id: str = Query(""),
    status: str = Query("all"),
    q: str = Query(""),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role", "fd")
    stmt = select(ArtworkBrief)
    if project_id:
        stmt = stmt.where(ArtworkBrief.project_id == project_id)
    if status != "all":
        stmt = stmt.where(ArtworkBrief.status == status)
    if q:
        stmt = stmt.where(
            ArtworkBrief.project_name.ilike(f"%{q}%") |
            ArtworkBrief.sku.ilike(f"%{q}%") |
            ArtworkBrief.artwork_id.ilike(f"%{q}%")
        )
    # Role filter: admin/mgmt/ceo see all; others see only their project's artworks
    if role not in ("admin", "mgmt", "ceo"):
        proj_stmt = select(Project.project_id).where(Project.teams_involved.contains(role))
        ids = [r[0] for r in (await db.execute(proj_stmt)).all()]
        stmt = stmt.where(ArtworkBrief.project_id.in_(ids))
    stmt = stmt.order_by(ArtworkBrief.updated_at.desc()).limit(200)
    result = await db.execute(stmt)
    return [_out(a) for a in result.scalars().all()]


@router.post("", status_code=201)
async def create_artwork(
    body: ArtworkCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role", "fd")
    if role not in CREATE_ROLES:
        raise HTTPException(403, "Only marketing, packaging, admin can create artwork briefs")
    proj_result = await db.execute(select(Project).where(Project.project_id == body.project_id))
    project = proj_result.scalars().first()
    if not project:
        raise HTTPException(404, f"Project {body.project_id} not found")

    count = (await db.execute(
        select(func.count()).select_from(ArtworkBrief).where(ArtworkBrief.project_id == body.project_id)
    )).scalar() or 0
    artwork_id = f"ART-{body.project_id}-{str(count + 1).zfill(2)}"

    art = ArtworkBrief(
        artwork_id=artwork_id,
        project_id=body.project_id,
        project_name=project.name,
        brand=project.brand,
        artwork_type=body.artwork_type or "Label",
        sku=body.sku,
        brief_notes=body.brief_notes,
        design_link=body.design_link,
        assigned_to=body.assigned_to,
        status="Brief Pending",
        created_by=current_user.get("name", ""),
        created_by_role=role,
    )
    db.add(art)
    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="CREATE",
        action_label=f"created artwork brief {artwork_id} for {project.name}",
        entity=artwork_id,
        involved_roles=project.teams_involved or "admin",
        time_ago="just now",
    ))
    # Notify packaging team
    teams = (project.teams_involved or "admin").split(",")
    await notify_roles(
        db, roles=["packaging", "admin"],
        title=f"Artwork Brief Created: {project.name}",
        message=f"{current_user.get('name','User')} created {body.artwork_type or 'Label'} artwork brief for {project.name} ({artwork_id}).",
        action_type="task_assigned", entity_id=body.project_id,
        entity_name=project.name, created_by=current_user.get("name", ""),
    )
    await db.commit()
    await db.refresh(art)
    return _out(art)


@router.put("/{artwork_id}")
async def update_artwork(
    artwork_id: str,
    body: ArtworkUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role", "fd")
    if role not in UPDATE_ROLES:
        raise HTTPException(403, "Only packaging, marketing, admin can update artwork")
    result = await db.execute(select(ArtworkBrief).where(ArtworkBrief.artwork_id == artwork_id))
    a = result.scalars().first()
    if not a:
        raise HTTPException(404, "Artwork brief not found")

    old_status = a.status
    updates = body.model_dump(exclude_none=True)
    for field, value in updates.items():
        setattr(a, field, value)

    change = f"status → {body.status}" if body.status else "details updated"
    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="UPDATE",
        action_label=f"updated artwork {artwork_id} — {change}",
        entity=artwork_id,
        involved_roles="admin",
        time_ago="just now",
    ))
    # Notify on status change
    if body.status and body.status != old_status:
        proj_result = await db.execute(select(Project).where(Project.project_id == a.project_id))
        project = proj_result.scalars().first()
        teams = (project.teams_involved if project else "admin").split(",")
        await notify_roles(
            db, roles=teams,
            title=f"Artwork Updated: {a.project_name}",
            message=f"{current_user.get('name','User')} updated artwork {artwork_id} — {change}.",
            action_type="info", entity_id=a.project_id,
            entity_name=a.project_name, created_by=current_user.get("name", ""),
        )
    await db.commit()
    return {"ok": True}


@router.delete("/{artwork_id}")
async def delete_artwork(
    artwork_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.get("role") not in ("admin",):
        raise HTTPException(403, "Only admin can delete artwork records")
    result = await db.execute(select(ArtworkBrief).where(ArtworkBrief.artwork_id == artwork_id))
    a = result.scalars().first()
    if not a:
        raise HTTPException(404, "Artwork brief not found")
    await db.delete(a)
    await db.commit()
    return {"ok": True}
