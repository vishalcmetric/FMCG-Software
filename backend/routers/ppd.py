"""
PPD (Product Development Plan) router.

Workflow:
  Step 1 — Source Team creates PPD → status "Draft"
           Auto-tasks created for R&D/F&D (fd) and PM to review.
  Step 2 — PM reviews & assigns teams, sets "Under Review"
  Step 3 — R&D/F&D + PM review; functional teams submit their review via reviewers patch
  Step 4 — Source Team clicks Submit → status "Submitted"
           Auto-tasks created for all 6 Mgmt Committee members.
  Step 5 — Management Committee: Marketing Head, Sales Head, R&D Head, GDSO Head,
           Regulatory Head, CFO — each approves independently via mgmt_approvals.
           When ALL 6 have approved → auto-advance to "Approved".
  Step 6 — CEO Final Approval → status "CEO Approved"
  Step 7 — Project moves to Formulation phase (PPD locked).
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified
import copy
from database import get_db
from auth import get_current_user, require_admin
from models import PPDCreate, PPDUpdate, PPDCommentCreate
from orm_models import PPDSubmission, PPDComment, Project, AuditLog, Task
from notify import notify_roles
from datetime import datetime, timezone

router = APIRouter(prefix="/api/ppd", tags=["ppd"])

# Default set of reviewer teams for every new PPD (functional review, Step 3)
DEFAULT_REVIEWERS = [
    {"role": "fd",          "team_label": "R&D / F&D Team",         "head_name": "", "status": "Pending", "comment": "", "updated_at": ""},
    {"role": "pm",          "team_label": "Project Management",      "head_name": "", "status": "Pending", "comment": "", "updated_at": ""},
    {"role": "marketing",   "team_label": "Marketing Team",         "head_name": "", "status": "Pending", "comment": "", "updated_at": ""},
    {"role": "regulatory",  "team_label": "Regulatory Team",        "head_name": "", "status": "Pending", "comment": "", "updated_at": ""},
    {"role": "packaging",   "team_label": "Packaging Team",         "head_name": "", "status": "Pending", "comment": "", "updated_at": ""},
    {"role": "sa",          "team_label": "Sales / GDSO Team",      "head_name": "", "status": "Pending", "comment": "", "updated_at": ""},
]

# Management Committee members — each must approve independently (Step 5)
MGMT_COMMITTEE = [
    {"role": "marketing_head", "label": "Marketing Head",    "status": "Pending", "comment": "", "approved_at": ""},
    {"role": "sales_head",     "label": "Sales Head",        "status": "Pending", "comment": "", "approved_at": ""},
    {"role": "rd_head",        "label": "R&D Head",          "status": "Pending", "comment": "", "approved_at": ""},
    {"role": "gdso_head",      "label": "GDSO Head",         "status": "Pending", "comment": "", "approved_at": ""},
    {"role": "regulatory",     "label": "Regulatory Head",   "status": "Pending", "comment": "", "approved_at": ""},
    {"role": "cfo",            "label": "CFO",               "status": "Pending", "comment": "", "approved_at": ""},
]

# Map system role keys → which mgmt_committee role they can approve
# mgmt role can represent marketing_head, sales_head, gdso_head, cfo
# rd_head role maps to rd_head committee slot
# regulatory role maps to regulatory committee slot
ROLE_TO_COMMITTEE: dict[str, str] = {
    "mgmt":        "marketing_head",   # default mgmt → acts as Marketing Head slot (admin can override)
    "rd_head":     "rd_head",
    "regulatory":  "regulatory",
    "sa":          "sales_head",
    "cfo":         "cfo",
    "gdso":        "gdso_head",
}


def _ppd_out(p: PPDSubmission) -> dict:
    return {
        "id":               p.id,
        "ppd_id":           p.ppd_id,
        "project_id":       p.project_id,
        "project_name":     p.project_name,
        "brand":            p.brand,
        "product_category": p.product_category,
        "target_consumer":  p.target_consumer,
        "market_segment":   p.market_segment,
        "expected_launch":  p.expected_launch,
        "objective":        p.objective,
        "key_benefits":     p.key_benefits,
        "status":           p.status,
        "ppd_version":      p.ppd_version,
        "teams_involved":   p.teams_involved,
        "created_by":       p.created_by,
        "created_by_email": p.created_by_email,
        "created_by_role":  p.created_by_role,
        "reviewers":        p.reviewers or [],
        "mgmt_approvals":   p.mgmt_approvals or [],
        "created_at":       p.created_at.isoformat() if p.created_at else None,
        "updated_at":       p.updated_at.isoformat() if p.updated_at else None,
    }


def _comment_out(c: PPDComment) -> dict:
    return {
        "id":         c.id,
        "ppd_id":     c.ppd_id,
        "user_name":  c.user_name,
        "user_role":  c.user_role,
        "comment":    c.comment,
        "action_tag": c.action_tag,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


def _all_mgmt_approved(mgmt_approvals: list) -> bool:
    """Return True if every member of the management committee has approved."""
    if not mgmt_approvals:
        return False
    return all(m.get("status") == "Approved" for m in mgmt_approvals)


# ── LIST ──────────────────────────────────────────────────────────────────────

@router.get("")
async def list_ppds(
    q:      str = Query("", description="Search by name / ID"),
    status: str = Query("all"),
    brand:  str = Query("all"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return all PPDs visible to the current user's role.
    Admin / mgmt / ceo see everything; others see only their team's PPDs.
    """
    role = current_user.get("role", "fd")
    stmt = select(PPDSubmission)

    if role not in ("admin", "mgmt", "ceo"):
        stmt = stmt.where(PPDSubmission.teams_involved.contains(role))
    if status != "all":
        stmt = stmt.where(PPDSubmission.status == status)
    if brand != "all":
        stmt = stmt.where(PPDSubmission.brand == brand)
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            PPDSubmission.project_name.ilike(pattern)
            | PPDSubmission.ppd_id.ilike(pattern)
            | PPDSubmission.project_id.ilike(pattern)
        )

    stmt = stmt.order_by(PPDSubmission.updated_at.desc()).limit(100)
    result = await db.execute(stmt)
    return [_ppd_out(p) for p in result.scalars().all()]


# ── GET ONE ───────────────────────────────────────────────────────────────────

@router.get("/{ppd_id}")
async def get_ppd(
    ppd_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "PPD not found")
    role = current_user.get("role", "fd")
    if role not in ("admin", "mgmt", "ceo") and role not in (p.teams_involved or "").split(","):
        raise HTTPException(403, "You are not assigned to this project's PPD")
    return _ppd_out(p)


# ── CREATE ────────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_ppd(
    body: PPDCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Step 1 — Source Team (or admin) creates PPD linked to a project.
    - Status starts as "Draft"
    - Auto-tasks created for R&D/F&D (fd) and PM to review the draft
    - Reviewer list seeded from DEFAULT_REVIEWERS
    - mgmt_approvals seeded from MGMT_COMMITTEE (all Pending)
    """
    # Verify project exists and caller is allowed
    proj_result = await db.execute(select(Project).where(Project.project_id == body.project_id))
    project = proj_result.scalars().first()
    if not project:
        raise HTTPException(404, f"Project {body.project_id} not found")

    role = current_user.get("role", "fd")
    if role not in ("admin",) and role not in (project.teams_involved or "").split(","):
        raise HTTPException(403, "You are not assigned to this project")

    # Check no duplicate PPD
    existing = await db.execute(select(PPDSubmission).where(PPDSubmission.project_id == body.project_id))
    if existing.scalars().first():
        raise HTTPException(400, f"A PPD already exists for project {body.project_id}. Use PUT to update it.")

    ppd_id = f"PPD-{body.project_id}"

    # Seed reviewers from DEFAULT_REVIEWERS
    reviewers = list(DEFAULT_REVIEWERS)

    # Seed management committee approvals (all start Pending)
    mgmt_approvals = [dict(m) for m in MGMT_COMMITTEE]

    ppd = PPDSubmission(
        ppd_id=ppd_id,
        project_id=body.project_id,
        project_name=body.project_name,
        brand=body.brand,
        product_category=body.product_category,
        target_consumer=body.target_consumer,
        market_segment=body.market_segment,
        expected_launch=body.expected_launch,
        objective=body.objective,
        key_benefits=body.key_benefits,
        status="Draft",          # Step 1 — always starts as Draft
        ppd_version="v1.0",
        teams_involved=project.teams_involved or "admin",
        created_by=current_user.get("name", ""),
        created_by_email=current_user.get("sub", ""),
        created_by_role=role,
        reviewers=reviewers,
        mgmt_approvals=mgmt_approvals,
    )
    db.add(ppd)

    # Step 1 → auto-assign review tasks to R&D/F&D and PM
    for target_role in ["fd", "pm"]:
        db.add(Task(
            title=f"Review PPD {ppd_id} — {body.project_name}",
            project_name=body.project_name,
            project_id=body.project_id,
            assigned_role=target_role,
            type="ppd_review",
            status="pending",
            priority="High",
            due_label="Today",
        ))

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="CREATE",
        action_label=f"created PPD {ppd_id} for project {body.project_id}: {body.project_name}",
        entity=ppd_id,
        involved_roles=project.teams_involved or "admin",
        time_ago="just now",
    ))

    target_roles = (project.teams_involved or "admin").split(",")
    await notify_roles(
        db,
        roles=target_roles,
        title=f"New PPD Created: {body.project_name}",
        message=(
            f"{current_user.get('name','User')} (Source Team) created PPD {ppd_id} for project {body.project_id}. "
            f"R&D/F&D and PM have been assigned review tasks."
        ),
        action_type="ppd_created",
        entity_id=ppd_id,
        entity_name=body.project_name,
        created_by=current_user.get("name", ""),
    )

    await db.commit()
    await db.refresh(ppd)
    return _ppd_out(ppd)


# ── UPDATE ────────────────────────────────────────────────────────────────────

@router.put("/{ppd_id}")
async def update_ppd(
    ppd_id: str,
    body: PPDUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update PPD details or status.
    Key transitions:
      Draft/Rework/Under Review → "Submitted" (Source Team only, Step 4)
        → Creates approval tasks for all 6 management committee roles.
      "Submitted"/"Approved" → "CEO Approved" (CEO only, Step 6)
        → Unlocks Formulation phase on parent project.
    """
    result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "PPD not found")

    role = current_user.get("role", "fd")
    # Access check
    if role not in ("admin", "mgmt", "ceo") and role not in (p.teams_involved or "").split(","):
        raise HTTPException(403, "You are not assigned to this PPD's project")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}

    if "status" in updates:
        new_status = updates["status"]

        # Step 4: Source Team submits for management approval
        if new_status == "Submitted":
            if role not in ("admin", "source"):
                raise HTTPException(403, "Only Source Team or admin can submit a PPD for management approval")
            # Create approval tasks for all 6 mgmt committee roles
            committee_role_map = {
                "marketing_head": "marketing",
                "sales_head":     "sa",
                "rd_head":        "rd_head",
                "gdso_head":      "sa",       # GDSO sits under sa for now
                "regulatory":     "regulatory",
                "cfo":            "mgmt",
            }
            for slot_key, sys_role in committee_role_map.items():
                db.add(Task(
                    title=f"Approve PPD {ppd_id} — {p.project_name}",
                    project_name=p.project_name,
                    project_id=p.project_id,
                    assigned_role=sys_role,
                    type="ppd_mgmt_approval",
                    status="pending",
                    priority="High",
                    due_label="Today",
                ))
            # Reset mgmt_approvals to Pending on re-submit (deep copy — avoids SQLAlchemy JSON mutation miss)
            p.mgmt_approvals = [copy.deepcopy({**m, "status": "Pending", "comment": "", "approved_at": ""}) for m in (p.mgmt_approvals or MGMT_COMMITTEE)]
            flag_modified(p, "mgmt_approvals")
            await notify_roles(
                db,
                roles=list(set(committee_role_map.values())),
                title=f"PPD Submitted for Approval: {p.project_name}",
                message=(
                    f"PPD {ppd_id} has been submitted by the Source Team for Management Committee approval. "
                    f"Please review and approve or request rework."
                ),
                action_type="ppd_submitted",
                entity_id=ppd_id,
                entity_name=p.project_name,
                created_by=current_user.get("name", ""),
            )

        # Step 6: CEO Final Approval
        elif new_status == "CEO Approved":
            if role not in ("admin", "ceo"):
                raise HTTPException(403, "Only CEO Office or admin can grant final PPD approval")
            # Unlock Formulation phase on linked project
            proj_res = await db.execute(select(Project).where(Project.project_id == p.project_id))
            proj = proj_res.scalars().first()
            if proj:
                proj.status = "Formulation"
                proj.progress = max(proj.progress or 0, 30)
            # Notify all teams
            await notify_roles(
                db,
                roles=(p.teams_involved or "admin").split(","),
                title=f"CEO Approved PPD: {p.project_name}",
                message=(
                    f"CEO has granted final approval for PPD {ppd_id}. "
                    f"Project is now moving to Formulation Development phase."
                ),
                action_type="ppd_ceo_approved",
                entity_id=ppd_id,
                entity_name=p.project_name,
                created_by=current_user.get("name", ""),
            )

        elif new_status == "Under Review":
            if role not in ("admin", "pm", "source"):
                raise HTTPException(403, "Only Project Management, Source or admin can set PPD to Under Review")

        elif new_status == "Rework":
            if role not in ("admin", "mgmt", "ceo", "rd_head", "regulatory", "marketing", "sa"):
                raise HTTPException(403, "Only Management Committee members or admin can send PPD for rework")

    # Bump version on content edits
    content_fields = {"objective", "key_benefits", "product_category", "target_consumer", "market_segment", "expected_launch"}
    if any(f in updates for f in content_fields):
        try:
            major, minor = p.ppd_version.lstrip("v").split(".")
            p.ppd_version = f"v{major}.{int(minor)+1}"
        except Exception:
            pass

    for field, value in updates.items():
        setattr(p, field, value)

    # Build change summary
    change_parts = []
    if "status" in updates:    change_parts.append(f"status → {updates['status']}")
    if "ppd_version" in updates: change_parts.append(f"version → {p.ppd_version}")
    change_summary = ", ".join(change_parts) if change_parts else "content updated"

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="UPDATE",
        action_label=f"updated PPD {ppd_id} — {change_summary}",
        entity=ppd_id,
        involved_roles=p.teams_involved or "admin",
        time_ago="just now",
    ))

    target_roles = (p.teams_involved or "admin").split(",")
    await notify_roles(
        db,
        roles=target_roles,
        title=f"PPD Updated: {p.project_name}",
        message=f"{current_user.get('name','User')} updated {ppd_id} ({p.brand}) — {change_summary}.",
        action_type="ppd_updated",
        entity_id=ppd_id,
        entity_name=p.project_name,
        created_by=current_user.get("name", ""),
    )

    await db.commit()
    return {"ok": True, "ppd_version": p.ppd_version}


# ── REVIEWER PATCH ────────────────────────────────────────────────────────────

@router.patch("/{ppd_id}/reviewers")
async def update_reviewers(
    ppd_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Step 3 — Sequential functional team review.
    Rules:
      - Admin can set any reviewer entry freely.
      - Non-admin can only update their own entry.
      - Sequential gate: a role may only update their entry when all entries
        BEFORE theirs in the list are already Reviewed or Approved.
        (The first entry is always open; subsequent entries are gated.)
    body: { reviewers: [{role, team_label, head_name, status, comment}] }
    """
    result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "PPD not found")

    role = current_user.get("role", "fd")
    new_reviewers = body.get("reviewers", [])

    DONE_STATUSES = {"Reviewed", "Approved"}

    if role == "admin":
        # Deep-copy so SQLAlchemy detects the change
        p.reviewers = copy.deepcopy(new_reviewers)
        flag_modified(p, "reviewers")
    else:
        # Deep-copy the stored list so every dict is a new object — prevents
        # SQLAlchemy from silently ignoring in-place dict mutations on JSON columns
        current_reviewers = copy.deepcopy(p.reviewers or [])

        # Find this role's position in the sequence
        my_index = next((i for i, r in enumerate(current_reviewers) if r.get("role") == role), None)
        if my_index is None:
            raise HTTPException(403, "Your role is not in the reviewer list for this PPD")

        # Sequential gate: all entries before my_index must be Reviewed or Approved
        for i, r in enumerate(current_reviewers[:my_index]):
            if r.get("status") not in DONE_STATUSES:
                prev_label = r.get("team_label", r.get("role", f"step {i+1}"))
                raise HTTPException(
                    403,
                    f"Cannot update your review yet — waiting for '{prev_label}' to complete their review first."
                )

        # Apply the update to this role's own entry
        new_status = None
        for r in current_reviewers:
            if r.get("role") == role:
                for nr in new_reviewers:
                    if nr.get("role") == role:
                        r["status"]     = nr.get("status", r.get("status"))
                        r["comment"]    = nr.get("comment", r.get("comment", ""))
                        r["updated_at"] = datetime.now(timezone.utc).isoformat()
                        new_status = r["status"]
                        break

        # Reassign the whole list and mark column dirty
        p.reviewers = current_reviewers
        flag_modified(p, "reviewers")

        # Notify the NEXT reviewer when this role just completed
        if new_status in DONE_STATUSES and my_index + 1 < len(current_reviewers):
            next_role = current_reviewers[my_index + 1].get("role")
            next_label = current_reviewers[my_index + 1].get("team_label", next_role)
            if next_role:
                await notify_roles(
                    db,
                    roles=[next_role],
                    title=f"PPD Review — Your Turn: {p.project_name}",
                    message=(
                        f"{current_user.get('name','User')} ({role}) completed their review on PPD {ppd_id}. "
                        f"It is now {next_label}'s turn to review."
                    ),
                    action_type="ppd_review_turn",
                    entity_id=ppd_id,
                    entity_name=p.project_name,
                    created_by=current_user.get("name", ""),
                )

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="UPDATE",
        action_label=f"updated reviewers for PPD {ppd_id}",
        entity=ppd_id,
        involved_roles=p.teams_involved or "admin",
        time_ago="just now",
    ))

    target_roles = (p.teams_involved or "admin").split(",")
    await notify_roles(
        db,
        roles=target_roles,
        title=f"PPD Review Updated: {p.project_name}",
        message=f"{current_user.get('name','User')} updated their review status on {ppd_id}.",
        action_type="ppd_reviewed",
        entity_id=ppd_id,
        entity_name=p.project_name,
        created_by=current_user.get("name", ""),
    )

    await db.commit()
    return {"ok": True, "reviewers": p.reviewers}


# ── MANAGEMENT COMMITTEE APPROVAL PATCH ───────────────────────────────────────

@router.patch("/{ppd_id}/mgmt-approve")
async def mgmt_committee_approve(
    ppd_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Step 5 — Management Committee member approves or requests rework on a Submitted PPD.
    body: { action: "approve" | "rework", comment: "...", committee_role: "<slot>" }

    The committee_role param lets admin/mgmt act on behalf of a specific slot.
    Otherwise the slot is inferred from the user's role.

    When ALL 6 committee members have approved → PPD status auto-advances to "Approved"
    and Source Team is notified to await CEO Final Approval.
    If any member requests rework → status goes back to "Rework" and Source Team is notified.
    """
    result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "PPD not found")

    if p.status not in ("Submitted", "Approved"):
        raise HTTPException(400, f"PPD is not in a state that allows management approval (current: {p.status})")

    role = current_user.get("role", "fd")
    # Determine which committee slot this user is acting on
    committee_role = body.get("committee_role") or ROLE_TO_COMMITTEE.get(role)
    if not committee_role and role != "admin":
        raise HTTPException(403, "Your role is not part of the Management Committee for this PPD")

    action  = body.get("action", "approve")
    comment = body.get("comment", "")

    if action not in ("approve", "rework"):
        raise HTTPException(400, "action must be 'approve' or 'rework'")

    # Authorisation: only the mapped role or admin can act on a slot
    allowed_for_slot = {
        "marketing_head": {"mgmt", "marketing", "admin"},
        "sales_head":     {"sa", "mgmt", "admin"},
        "rd_head":        {"rd_head", "admin"},
        "gdso_head":      {"sa", "mgmt", "admin"},
        "regulatory":     {"regulatory", "admin"},
        "cfo":            {"mgmt", "admin"},
    }
    if role != "admin" and role not in allowed_for_slot.get(committee_role, set()):
        raise HTTPException(403, f"Role '{role}' cannot act on committee slot '{committee_role}'")

    # Deep-copy so SQLAlchemy detects the mutation on the JSON column
    approvals = copy.deepcopy(p.mgmt_approvals or [dict(m) for m in MGMT_COMMITTEE])
    for entry in approvals:
        if entry.get("role") == committee_role:
            entry["status"]      = "Approved" if action == "approve" else "Rework"
            entry["comment"]     = comment
            entry["approved_at"] = datetime.now(timezone.utc).isoformat()
            break
    p.mgmt_approvals = approvals
    flag_modified(p, "mgmt_approvals")

    target_roles = (p.teams_involved or "admin").split(",")

    if action == "rework":
        # Send PPD back to Source Team for rework
        p.status = "Rework"
        await notify_roles(
            db,
            roles=target_roles,
            title=f"PPD Sent for Rework: {p.project_name}",
            message=(
                f"{current_user.get('name','User')} ({committee_role}) requested rework on PPD {ppd_id}. "
                f"Reason: {comment or 'No reason provided'}. Source team please revise and re-submit."
            ),
            action_type="ppd_rework",
            entity_id=ppd_id,
            entity_name=p.project_name,
            created_by=current_user.get("name", ""),
        )
    else:
        # Check if ALL committee members have now approved
        if _all_mgmt_approved(approvals):
            p.status = "Approved"
            await notify_roles(
                db,
                roles=target_roles,
                title=f"All Committee Approvals Received: {p.project_name}",
                message=(
                    f"All 6 Management Committee members have approved PPD {ppd_id}. "
                    f"PPD is now pending CEO Final Approval."
                ),
                action_type="ppd_committee_approved",
                entity_id=ppd_id,
                entity_name=p.project_name,
                created_by=current_user.get("name", ""),
            )
        else:
            pending = [m["label"] for m in approvals if m.get("status") != "Approved"]
            await notify_roles(
                db,
                roles=["admin", "source"],
                title=f"Committee Approval Progress: {p.project_name}",
                message=(
                    f"{current_user.get('name','User')} ({committee_role}) approved PPD {ppd_id}. "
                    f"Still pending: {', '.join(pending)}."
                ),
                action_type="ppd_committee_progress",
                entity_id=ppd_id,
                entity_name=p.project_name,
                created_by=current_user.get("name", ""),
            )

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="UPDATE",
        action_label=f"{action} by {committee_role} on PPD {ppd_id}",
        entity=ppd_id,
        involved_roles=p.teams_involved or "admin",
        time_ago="just now",
    ))

    await db.commit()
    return {"ok": True, "status": p.status, "mgmt_approvals": p.mgmt_approvals}


# ── COMMENTS ──────────────────────────────────────────────────────────────────

@router.get("/{ppd_id}/comments")
async def list_comments(
    ppd_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PPDComment).where(PPDComment.ppd_id == ppd_id).order_by(PPDComment.created_at.asc())
    )
    return [_comment_out(c) for c in result.scalars().all()]


@router.post("/{ppd_id}/comments", status_code=201)
async def add_comment(
    ppd_id: str,
    body: PPDCommentCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "PPD not found")

    role = current_user.get("role", "fd")
    if role not in ("admin", "mgmt", "ceo") and role not in (p.teams_involved or "").split(","):
        raise HTTPException(403, "You are not assigned to this PPD")

    comment = PPDComment(
        ppd_id=ppd_id,
        user_name=current_user.get("name", ""),
        user_role=role,
        comment=body.comment,
        action_tag=body.action_tag,
    )
    db.add(comment)

    # CEO can approve via comment too (legacy support)
    if body.action_tag == "approve" and role in ("ceo", "admin"):
        p.status = "CEO Approved"
        proj_res = await db.execute(select(Project).where(Project.project_id == p.project_id))
        proj = proj_res.scalars().first()
        if proj:
            proj.status = "Formulation"
            proj.progress = max(proj.progress or 0, 30)

    target_roles = (p.teams_involved or "admin").split(",")
    await notify_roles(
        db,
        roles=target_roles,
        title=f"New Comment on PPD: {p.project_name}",
        message=f"{current_user.get('name','User')} ({role}) posted a {body.action_tag} on {ppd_id}.",
        action_type="ppd_comment",
        entity_id=ppd_id,
        entity_name=p.project_name,
        created_by=current_user.get("name", ""),
    )

    await db.commit()
    await db.refresh(comment)
    return _comment_out(comment)


# ── DELETE (admin only) ───────────────────────────────────────────────────────

@router.delete("/{ppd_id}")
async def delete_ppd(
    ppd_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "PPD not found")

    teams = (p.teams_involved or "admin").split(",")
    name = p.project_name
    await db.delete(p)

    await notify_roles(
        db,
        roles=teams,
        title=f"PPD Deleted: {name}",
        message=f"{current_user.get('name','Admin')} deleted PPD {ppd_id} ({name}).",
        action_type="ppd_deleted",
        entity_id=ppd_id,
        entity_name=name,
        created_by=current_user.get("name", "Admin"),
    )

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="DELETE",
        action_label=f"deleted PPD {ppd_id} ({name})",
        entity=ppd_id,
        involved_roles="admin",
        time_ago="just now",
    ))

    await db.commit()
    return {"ok": True}
