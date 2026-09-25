"""
Formulation Development router.

Rules:
  - Admin, fd, rd_head can create / update formulas.
  - Any role in teams_involved can view and comment.
  - Status changes to Recommended / Rejected are admin / rd_head only.
  - All mutations fire notifications to all roles.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db, fmt_ist
from auth import get_current_user
from models import FormulaCreate, FormulaUpdate, FormulaCommentCreate, FormulaApprovalDecision
from orm_models import FormulaIngredient, Formula, FormulaComment, PPDSubmission, AuditLog, LabExperiment, SensoryEvaluation, CostingRecord, Notification, MasterConfig
from sqlalchemy import delete as sa_delete
from notify import notify_roles
from formula_ingredients import clean_row, row_out
from ppd_fields import html_to_text, text_to_html
from datetime import datetime, timezone

router = APIRouter(prefix="/api/formulation", tags=["formulation"])

FORMULA_STATUSES = ["Draft", "In Testing", "Sensory Pass", "Recommended", "Rejected"]
ALLOWED_CREATE_ROLES = {"admin", "fd", "fd_member", "rd_head"}   # F&D Team (head + members), R&D Head

ALL_ROLES = "admin,source,pm,fd,rd_head,marketing,regulatory,packaging,adl,pmsa,sa,mgmt,ceo,production"


RICH_FIELDS = ("method_of_preparation", "observation", "conclusion")


def _apply_rich(f: Formula, rich) -> None:
    """Rich-text fields: column = plain text as typed, formatted HTML kept in rich_html."""
    if rich is None:
        return
    keep = {}
    for k in RICH_FIELDS:
        if k in rich:
            html = (rich.get(k) or "").strip()
            setattr(f, k, html_to_text(html) or None)
            if html:
                keep[k] = html
        elif (f.rich_html or {}).get(k):
            keep[k] = f.rich_html[k]
    f.rich_html = keep


def _rich_out(f: Formula) -> dict:
    out = {}
    for k in RICH_FIELDS:
        text, html = getattr(f, k) or "", (f.rich_html or {}).get(k)
        out[k] = html if html and html_to_text(html) == text else text_to_html(text)
    return out


_ING_TABLE_OK = False


async def _ing_table(db: AsyncSession) -> bool:
    """True once the formula_ingredients table exists (it cannot be created while the DB disk is full)."""
    global _ING_TABLE_OK
    if not _ING_TABLE_OK:
        _ING_TABLE_OK = bool((await db.execute(text(
            "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'formula_ingredients'"
        ))).first())
    return _ING_TABLE_OK


async def _save_ingredients(db: AsyncSession, f: Formula, rows) -> None:
    """Replace the formula's ingredient rows (Sr. No. assigned automatically) and keep the JSON mirror."""
    clean = [r for r in (clean_row(x) for x in (rows or [])) if r]
    if await _ing_table(db):
        await db.execute(sa_delete(FormulaIngredient).where(FormulaIngredient.formula_id == f.formula_id))
        for n, r in enumerate(clean, 1):
            db.add(FormulaIngredient(formula_id=f.formula_id, sr_no=n, **r))
    f.ingredients = [row_out(r, n) for n, r in enumerate(clean, 1)]


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
        "rich_html":             _rich_out(f),
        "attachments":           f.attachments or {},
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


# ── ALL TRIALS OF ONE PPD (E-Lab Notebook) ────────────────────────────────────

async def _ppd_trials(db: AsyncSession, ppd_id: str) -> list[dict]:
    """Every formula/trial of a PPD in creation order, each with its own ingredient rows."""
    formulas = (await db.execute(select(Formula).where(Formula.ppd_id == ppd_id)
                                 .order_by(Formula.created_at.asc(), Formula.id.asc()))).scalars().all()
    rows_by_formula = {}
    if formulas and await _ing_table(db):
        rows = (await db.execute(select(FormulaIngredient)
                                 .where(FormulaIngredient.formula_id.in_([f.formula_id for f in formulas]))
                                 .order_by(FormulaIngredient.formula_id, FormulaIngredient.sr_no))).scalars().all()
        for r in rows:
            rows_by_formula.setdefault(r.formula_id, []).append(row_out(r.__dict__, r.sr_no))
    codes = await _material_codes(db) if formulas else {}
    out = []
    for f in formulas:
        d = _formula_out(f)
        if rows_by_formula.get(f.formula_id):
            d["ingredients"] = rows_by_formula[f.formula_id]
        d["ingredients"] = [{**i, "material_code": codes.get((i.get("name") or "").strip().lower(), "")} for i in d["ingredients"]]
        out.append(d)
    return out


async def _material_codes(db: AsyncSession) -> dict:
    """Ingredient name (lower-case) → Material Code from Master Data (Code Master first, then INCI Number)."""
    rows = (await db.execute(select(MasterConfig).where(MasterConfig.config_type.in_(("inci", "code_rm")),
                                                        MasterConfig.is_active == True))).scalars().all()  # noqa: E712
    codes = {}
    for r in sorted(rows, key=lambda r: r.config_type != "code_rm"):          # code_rm wins over inci
        code = r.key if r.config_type == "code_rm" else (r.meta or {}).get("material_code")
        name = (r.label or "").strip().lower()
        if name and code and name not in codes:
            codes[name] = code
    return codes


def elab_header(p: PPDSubmission) -> dict:
    """PPD values shown in the E-Lab Notebook sheet header."""
    return {"ppd_id": p.ppd_id, "project_name": p.project_name, "title": p.ppd_title or "",
            "objective": p.target_objective or p.overall_goal or "", "packaging": p.primary_pack_description or ""}


@router.get("/by-ppd/{ppd_id}")
async def list_ppd_trials(
    ppd_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p = (await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))).scalars().first()
    if not p:
        raise HTTPException(404, f"PPD {ppd_id} not found")
    return {"ppd": elab_header(p), "trials": await _ppd_trials(db, ppd_id)}


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
    out = _formula_out(f)
    rows = (await db.execute(select(FormulaIngredient).where(FormulaIngredient.formula_id == formula_id)
                             .order_by(FormulaIngredient.sr_no))).scalars().all() if await _ing_table(db) else []
    if rows:
        out["ingredients"] = [row_out(r.__dict__, r.sr_no) for r in rows]
    return out


# ── CREATE ────────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_formula(
    body: FormulaCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role", "fd")
    if role not in ALLOWED_CREATE_ROLES:
        raise HTTPException(403, "Only admin, F&D Team, or R&D Head can create formulas")

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
        ingredients=[],
        attachments=body.attachments or {},
        created_by=current_user.get("name", ""),
        created_by_role=role,
    )
    _apply_rich(formula, body.rich_html)
    db.add(formula)
    await db.flush()
    await _save_ingredients(db, formula, body.ingredients)
    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="CREATE",
        action_label=f"created formula {fid} for PPD {body.ppd_id}",
        entity=fid,
        involved_roles=ppd.teams_involved or ALL_ROLES,
        time_ago="just now",
    ))

    # Notify only the formulation team — fd, rd_head, admin
    await notify_roles(
        db,
        roles=["fd", "rd_head", "admin"],
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
        raise HTTPException(403, "Only admin, F&D Team, or R&D Head can update formulas")

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
                      "observation", "conclusion", "ingredients", "rich_html", "attachments"}
    if any(field in updates for field in content_fields):
        try:
            major, minor = f.version.lstrip("v").split(".")
            f.version = f"v{major}.{int(minor) + 1}"
        except Exception:
            pass

    rows = updates.pop("ingredients", None)
    rich = updates.pop("rich_html", None)
    for field, value in updates.items():
        setattr(f, field, value)
    if rich is not None:
        _apply_rich(f, rich)
    if rows is not None:
        await _save_ingredients(db, f, rows)

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

    # Notify only the formulation team — fd, rd_head, admin
    await notify_roles(
        db,
        roles=["fd", "rd_head", "admin"],
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

    # Cascade-delete all related records that reference this formula_id
    for comment in (await db.execute(
        select(FormulaComment).where(FormulaComment.formula_id == formula_id)
    )).scalars().all():
        await db.delete(comment)

    for exp in (await db.execute(
        select(LabExperiment).where(LabExperiment.formula_id == formula_id)
    )).scalars().all():
        await db.delete(exp)

    for se in (await db.execute(
        select(SensoryEvaluation).where(SensoryEvaluation.formula_id == formula_id)
    )).scalars().all():
        await db.delete(se)

    for cr in (await db.execute(
        select(CostingRecord).where(CostingRecord.formula_id == formula_id)
    )).scalars().all():
        await db.delete(cr)

    # Delete notifications referencing this formula so they don't show as stale
    await db.execute(sa_delete(Notification).where(Notification.entity_id == formula_id))
    if await _ing_table(db):
        await db.execute(sa_delete(FormulaIngredient).where(FormulaIngredient.formula_id == formula_id))

    await db.delete(f)
    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="DELETE",
        action_label=f"deleted formula {formula_id} and all related records (comments, lab experiments, sensory evaluations, costing records)",
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

    # Comments only go to the formulation team (fd + rd_head) and admin
    await notify_roles(
        db,
        roles=["fd", "rd_head", "admin"],
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
    if role != "fd":
        raise HTTPException(403, "Only fd team can send a formula for approval")

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

    if f.approval_status == "approved" and body.decision == "approved":
        raise HTTPException(400, "This formula is already approved")
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

    # Review result goes only to the fd creator and admin (not all PPD teams)
    await notify_roles(
        db,
        roles=["fd", "admin"],
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
