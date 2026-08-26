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
from database import get_db, fmt_ist
from auth import get_current_user
from models import FormulaCreate, FormulaUpdate, FormulaCommentCreate, FormulaApprovalDecision
from orm_models import Formula, FormulaComment, PPDSubmission, AuditLog
from notify import notify_roles
from datetime import datetime, timezone

router = APIRouter(prefix="/api/formulation", tags=["formulation"])

FORMULA_STATUSES = ["Draft", "In Testing", "Sensory Pass", "Recommended", "Rejected"]
ALLOWED_CREATE_ROLES = {"admin", "fd", "rd_head"}

ALL_ROLES = "admin,source,pm,fd,rd_head,marketing,regulatory,packaging,adl,pmsa,sa,mgmt,ceo,production"


def _formula_out(f: Formula) -> dict:
    return {
        "id":                    f.id,
        "formula_id":            f.formula_id,
        "ppd_id":                f.ppd_id,
        "project_name":          f.project_name,
        "version":               f.version,
        "status":                f.status,
        "trial_no":              f.trial_no,
        "batch_no":              f.batch_no,
        "batch_size":            f.batch_size,
        "unit_qty":              f.unit_qty,
        "mfg_date":              f.mfg_date,
        "trial_taken_by":        f.trial_taken_by,
        "evaluated_by":          f.evaluated_by,
        "method_of_preparation": f.method_of_preparation,
        "observation":           f.observation,
        "conclusion":            f.conclusion,
        "ingredients":           f.ingredients or [],
        "approval_status":       f.approval_status,
        "approval_comment":      f.approval_comment,
        "approved_by":           f.approved_by,
        "approved_at":           fmt_ist(f.approved_at),
        "created_by":            f.created_by,
        "created_by_role":       f.created_by_role,
        "created_at":            fmt_ist(f.created_at),
        "updated_at":            fmt_ist(f.updated_at),
    }


def _comment_out(c: FormulaComment) -> dict:
    return {
        "id":         c.id,
        "formula_id": c.formula_id,
        "user_name":  c.user_name,
        "user_role":  c.user_role,
        "comment":    c.comment,
        "created_at": fmt_ist(c.created_at),
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
        status="Draft",
        trial_no=body.trial_no,
        batch_no=body.batch_no,
        batch_size=body.batch_size,
        unit_qty=body.unit_qty,
        mfg_date=body.mfg_date,
        trial_taken_by=body.trial_taken_by,
        evaluated_by=body.evaluated_by,
        method_of_preparation=body.method_of_preparation,
        observation=body.observation,
        conclusion=body.conclusion,
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
        message=f"{current_user.get('name','User')} created formula {fid} (Trial No: {body.trial_no or '—'}) for {ppd.project_name}.",
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
    content_fields = {"trial_no", "batch_no", "batch_size", "unit_qty", "mfg_date",
                      "trial_taken_by", "evaluated_by", "method_of_preparation",
                      "observation", "conclusion", "ingredients"}
    if any(field in updates for field in content_fields):
        try:
            major, minor = f.version.lstrip("v").split(".")
            f.version = f"v{major}.{int(minor) + 1}"
        except Exception:
            pass

    for field, value in updates.items():
        setattr(f, field, value)

    change_parts = []
    if "status" in updates:   change_parts.append(f"status → {updates['status']}")
    if "trial_no" in updates: change_parts.append(f"trial → {updates['trial_no']}")
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


# ── Send for Approval ─────────────────────────────────────────────────────────

@router.post("/{formula_id}/send-for-approval", status_code=200)
async def send_for_approval(
    formula_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    fd / admin marks a formula ready for R&D Head review.
    - Sets approval_status = 'pending_approval'
    - Advances status Draft → In Testing
    - Notifies rd_head
    """
    role = current_user.get("role", "fd")
    if role not in ("admin", "fd"):
        raise HTTPException(403, "Only fd or admin can send a formula for approval")

    result = await db.execute(select(Formula).where(Formula.formula_id == formula_id))
    f = result.scalars().first()
    if not f:
        raise HTTPException(404, "Formula not found")

    if f.approval_status == "pending_approval":
        raise HTTPException(400, "Formula is already pending approval")

    # Advance status Draft → In Testing; set approval workflow flag
    if f.status == "Draft":
        f.status = "In Testing"
    f.approval_status = "pending_approval"
    f.approval_comment = None
    f.approved_by = None
    f.approved_at = None

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="SUBMIT",
        action_label=f"sent formula {formula_id} for R&D Head approval",
        entity=formula_id,
        involved_roles="rd_head",
        time_ago="just now",
    ))

    await notify_roles(
        db,
        roles=["rd_head"],
        title=f"Formula Requires Your Approval: {formula_id}",
        message=(
            f"{current_user.get('name','User')} (F&D) has submitted formula {formula_id} "
            f"({f.project_name}) for your approval. Please review and approve or reject."
        ),
        action_type="formula_approval",
        entity_id=f.ppd_id or formula_id,
        entity_name=f.project_name or formula_id,
        created_by=current_user.get("name", ""),
    )

    await db.commit()
    return {"ok": True, "formula_id": formula_id, "status": f.status,
            "approval_status": f.approval_status, "notified": ["rd_head"]}


# ── Approve / Reject (rd_head) ────────────────────────────────────────────────

@router.post("/{formula_id}/review", status_code=200)
async def review_formula(
    formula_id: str,
    body: FormulaApprovalDecision,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    rd_head (or admin) approves or rejects a formula that was sent for approval.
    decision must be "approved" or "rejected".
    - "approved"  → status becomes "Recommended", approval_status = "approved"
    - "rejected"  → status stays as-is (or can be set back to Draft), approval_status = "rejected"
    """
    role = current_user.get("role", "fd")
    if role not in ("admin", "rd_head"):
        raise HTTPException(403, "Only rd_head or admin can approve/reject a formula")

    if body.decision not in ("approved", "rejected"):
        raise HTTPException(400, "decision must be 'approved' or 'rejected'")

    result = await db.execute(select(Formula).where(Formula.formula_id == formula_id))
    f = result.scalars().first()
    if not f:
        raise HTTPException(404, "Formula not found")

    if f.approval_status not in ("pending_approval", None):
        # Allow re-review only if it was previously reviewed (admin override scenario)
        pass  # proceed anyway — rd_head can always change decision

    from datetime import datetime, timezone
    f.approval_status  = body.decision          # "approved" | "rejected"
    f.approval_comment = body.comment or ""
    f.approved_by      = current_user.get("name", "")
    f.approved_at      = datetime.now(timezone.utc).replace(tzinfo=None)

    if body.decision == "approved":
        f.status = "Recommended"
        action_label = f"approved formula {formula_id} → Recommended"
        notif_title  = f"Formula Approved ✓: {formula_id}"
        notif_msg    = (
            f"{current_user.get('name','R&D Head')} approved formula {formula_id} "
            f"({f.project_name}). Status is now Recommended."
            + (f" Comment: {body.comment}" if body.comment else "")
        )
    else:
        f.status = "Draft"          # send back for rework
        action_label = f"rejected formula {formula_id} → back to Draft"
        notif_title  = f"Formula Rejected: {formula_id}"
        notif_msg    = (
            f"{current_user.get('name','R&D Head')} rejected formula {formula_id} "
            f"({f.project_name}). It has been returned to Draft for rework."
            + (f" Reason: {body.comment}" if body.comment else "")
        )

    # Get PPD teams to notify the fd who submitted it + all stakeholders
    ppd_result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == f.ppd_id))
    ppd = ppd_result.scalars().first()
    teams = (ppd.teams_involved if ppd else ALL_ROLES) or ALL_ROLES

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="APPROVE" if body.decision == "approved" else "REJECT",
        action_label=action_label,
        entity=formula_id,
        involved_roles=teams,
        time_ago="just now",
    ))

    await notify_roles(
        db,
        roles=teams.split(","),
        title=notif_title,
        message=notif_msg,
        action_type="info",
        entity_id=f.ppd_id or formula_id,
        entity_name=f.project_name or formula_id,
        created_by=current_user.get("name", ""),
    )

    await db.commit()
    return {
        "ok": True,
        "formula_id":     formula_id,
        "status":         f.status,
        "approval_status": f.approval_status,
        "approved_by":    f.approved_by,
    }
