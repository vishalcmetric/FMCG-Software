"""
Formulation Development router.

Rules:
  - Admin, fd, rd_head can create / update formulas.
  - Any role in teams_involved can view and comment.
  - Status changes to Recommended / Rejected are admin / rd_head only.
  - All mutations fire notifications to all roles.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth import get_current_user
from models import FormulaCreate, FormulaUpdate, FormulaCommentCreate
from orm_models import Formula, FormulaComment, PPDSubmission, AuditLog
from notify import notify_roles
from datetime import datetime, timezone

router = APIRouter(prefix="/api/formulation", tags=["formulation"])

FORMULA_STATUSES = ["Draft", "In Testing", "Sensory Pass", "Recommended", "Rejected"]
ALLOWED_CREATE_ROLES = {"admin", "fd", "rd_head"}

ALL_ROLES = "admin,source,pm,fd,rd_head,marketing,regulatory,packaging,adl,pmsa,sa,mgmt,ceo,production"


def _formula_out(f: Formula) -> dict:
    return {
        "id":             f.id,
        "formula_id":     f.formula_id,
        "ppd_id":         f.ppd_id,
        "project_name":   f.project_name,
        "version":        f.version,
        "formula_type":   f.formula_type,
        "status":         f.status,
        "protein_source": f.protein_source,
        "sweetener":      f.sweetener,
        "cocoa_pct":      f.cocoa_pct,
        "protein_pct":    f.protein_pct,
        "sugar_per_100g": f.sugar_per_100g,
        "cost_per_kg":    f.cost_per_kg,
        "stability_40c":  f.stability_40c,
        "sensory_score":  f.sensory_score,
        "notes":          f.notes,
        "ingredients":    f.ingredients or [],
        "created_by":     f.created_by,
        "created_by_role":f.created_by_role,
        "created_at":     f.created_at.isoformat() if f.created_at else None,
        "updated_at":     f.updated_at.isoformat() if f.updated_at else None,
    }


def _comment_out(c: FormulaComment) -> dict:
    return {
        "id":         c.id,
        "formula_id": c.formula_id,
        "user_name":  c.user_name,
        "user_role":  c.user_role,
        "comment":    c.comment,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


# ── LIST ──────────────────────────────────────────────────────────────────────

@router.get("")
async def list_formulas(
    ppd_id:  str = Query("", description="Filter by PPD ID"),
    status:  str = Query("all"),
    q:       str = Query(""),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role", "fd")
    stmt = select(Formula)

    if ppd_id:
        stmt = stmt.where(Formula.ppd_id == ppd_id)
    if status != "all":
        stmt = stmt.where(Formula.status == status)
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            Formula.formula_id.ilike(pattern) | Formula.project_name.ilike(pattern)
        )

    stmt = stmt.order_by(Formula.updated_at.desc()).limit(200)
    result = await db.execute(stmt)
    return [_formula_out(f) for f in result.scalars().all()]


# ── GET ONE ───────────────────────────────────────────────────────────────────

@router.get("/{formula_id}")
async def get_formula(
    formula_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Formula).where(Formula.formula_id == formula_id))
    f = result.scalars().first()
    if not f:
        raise HTTPException(404, "Formula not found")
    return _formula_out(f)


# ── CREATE ────────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_formula(
    body: FormulaCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role", "fd")
    if role not in ALLOWED_CREATE_ROLES:
        raise HTTPException(403, "Only admin, fd, or rd_head can create formulas")

    # Look up PPD to get project_name
    ppd_result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == body.ppd_id))
    ppd = ppd_result.scalars().first()
    if not ppd:
        raise HTTPException(404, f"PPD {body.ppd_id} not found")

    # Generate formula ID
    seq = ((await db.execute(select(func.count()).select_from(Formula).where(Formula.ppd_id == body.ppd_id))).scalar() or 0) + 1
    while (await db.execute(select(Formula.id).where(Formula.formula_id == f"F-{body.ppd_id}-{str(seq).zfill(2)}"))).scalar():
        seq += 1
    fid = f"F-{body.ppd_id}-{str(seq).zfill(2)}"

    formula = Formula(
        formula_id=fid,
        ppd_id=body.ppd_id,
        project_name=body.project_name or ppd.project_name,
        version="v1.0",
        formula_type=body.formula_type or "Trial",
        status="Draft",
        protein_source=body.protein_source,
        sweetener=body.sweetener,
        cocoa_pct=body.cocoa_pct,
        protein_pct=body.protein_pct,
        sugar_per_100g=body.sugar_per_100g,
        cost_per_kg=body.cost_per_kg,
        stability_40c=body.stability_40c,
        sensory_score=body.sensory_score,
        notes=body.notes,
        ingredients=body.ingredients or [],
        created_by=current_user.get("name", ""),
        created_by_role=role,
    )
    db.add(formula)
    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="CREATE",
        action_label=f"created formula {fid} for PPD {body.ppd_id}",
        entity=fid,
        involved_roles=ppd.teams_involved or ALL_ROLES,
        time_ago="just now",
    ))

    target_roles = (ppd.teams_involved or ALL_ROLES).split(",")
    await notify_roles(
        db,
        roles=target_roles,
        title=f"New Formula: {fid}",
        message=f"{current_user.get('name','User')} created formula {fid} ({body.formula_type or 'Trial'}) for {ppd.project_name}.",
        action_type="info",
        entity_id=body.ppd_id,
        entity_name=ppd.project_name,
        created_by=current_user.get("name", ""),
    )

    await db.commit()
    await db.refresh(formula)
    return _formula_out(formula)


# ── UPDATE ────────────────────────────────────────────────────────────────────

@router.put("/{formula_id}")
async def update_formula(
    formula_id: str,
    body: FormulaUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role", "fd")
    if role not in ALLOWED_CREATE_ROLES:
        raise HTTPException(403, "Only admin, fd, or rd_head can update formulas")

    result = await db.execute(select(Formula).where(Formula.formula_id == formula_id))
    f = result.scalars().first()
    if not f:
        raise HTTPException(404, "Formula not found")

    # Status guard
    privileged_statuses = {"Recommended", "Rejected"}
    if body.status in privileged_statuses and role not in ("admin", "rd_head"):
        raise HTTPException(403, f"Only admin or rd_head can set status to '{body.status}'")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}

    # Bump version on content edits
    content_fields = {"protein_source", "sweetener", "cocoa_pct", "protein_pct",
                      "sugar_per_100g", "cost_per_kg", "stability_40c", "ingredients"}
    if any(field in updates for field in content_fields):
        try:
            major, minor = f.version.lstrip("v").split(".")
            f.version = f"v{major}.{int(minor) + 1}"
        except Exception:
            pass

    for field, value in updates.items():
        setattr(f, field, value)

    change_parts = []
    if "status" in updates:      change_parts.append(f"status → {updates['status']}")
    if "formula_type" in updates: change_parts.append(f"type → {updates['formula_type']}")
    change_summary = ", ".join(change_parts) if change_parts else "details updated"

    # Get PPD teams for notifications
    ppd_result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == f.ppd_id))
    ppd = ppd_result.scalars().first()
    teams = ppd.teams_involved if ppd else ALL_ROLES

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="UPDATE",
        action_label=f"updated formula {formula_id} — {change_summary}",
        entity=formula_id,
        involved_roles=teams or ALL_ROLES,
        time_ago="just now",
    ))

    target_roles = (teams or ALL_ROLES).split(",")
    await notify_roles(
        db,
        roles=target_roles,
        title=f"Formula Updated: {formula_id}",
        message=f"{current_user.get('name','User')} updated {formula_id} — {change_summary}.",
        action_type="info",
        entity_id=f.ppd_id,
        entity_name=f.project_name,
        created_by=current_user.get("name", ""),
    )

    await db.commit()
    return {"ok": True, "version": f.version}


# ── DELETE ────────────────────────────────────────────────────────────────────

@router.delete("/{formula_id}")
async def delete_formula(
    formula_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role", "fd")
    if role not in ("admin", "rd_head"):
        raise HTTPException(403, "Only admin or rd_head can delete formulas")

    result = await db.execute(select(Formula).where(Formula.formula_id == formula_id))
    f = result.scalars().first()
    if not f:
        raise HTTPException(404, "Formula not found")

    await db.delete(f)
    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="DELETE",
        action_label=f"deleted formula {formula_id}",
        entity=formula_id,
        involved_roles="admin",
        time_ago="just now",
    ))

    await db.commit()
    return {"ok": True}


# ── COMMENTS ──────────────────────────────────────────────────────────────────

@router.get("/{formula_id}/comments")
async def list_comments(
    formula_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FormulaComment)
        .where(FormulaComment.formula_id == formula_id)
        .order_by(FormulaComment.created_at.asc())
    )
    return [_comment_out(c) for c in result.scalars().all()]


@router.post("/{formula_id}/comments", status_code=201)
async def add_comment(
    formula_id: str,
    body: FormulaCommentCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Formula).where(Formula.formula_id == formula_id))
    f = result.scalars().first()
    if not f:
        raise HTTPException(404, "Formula not found")

    role = current_user.get("role", "fd")
    comment = FormulaComment(
        formula_id=formula_id,
        user_name=current_user.get("name", ""),
        user_role=role,
        comment=body.comment,
    )
    db.add(comment)

    ppd_result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == f.ppd_id))
    ppd = ppd_result.scalars().first()
    teams = ppd.teams_involved if ppd else ALL_ROLES

    await notify_roles(
        db,
        roles=(teams or ALL_ROLES).split(","),
        title=f"New Comment on Formula: {formula_id}",
        message=f"{current_user.get('name','User')} ({role}) commented on {formula_id}: {body.comment[:80]}",
        action_type="info",
        entity_id=f.ppd_id,
        entity_name=f.project_name,
        created_by=current_user.get("name", ""),
    )

    await db.commit()
    await db.refresh(comment)
    return _comment_out(comment)
