"""
PPD (Product Development Plan) router — simplified workflow.

Status workflow (all roles):
  Pending  →  Rework (reviewer sends back with comment)
           →  Approved (reviewer approves)

Rework flow:
  Reviewer marks Rework + provides comment
  → Notification sent ONLY to the task owner(s) involved in this PPD
  → Task owner replies / confirms rework done
  → Task goes back to reviewer
  → Reviewer can then Approve
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified
import copy, os, uuid, aiofiles
from database import get_db, now_ist_naive, IST, fmt_ist
from auth import get_current_user, require_admin
from models import PPDCreate, PPDUpdate, PPDCommentCreate
from orm_models import PPDSubmission, PPDComment, AuditLog, Task
from notify import notify_roles
from datetime import datetime

router = APIRouter(prefix="/api/ppd", tags=["ppd"])

# Full team list — used for post-approval visibility
ALL_ROLES = "admin,source,pm,fd,rd_head,marketing,regulatory,packaging,adl,pmsa,sa,mgmt,ceo,production"

# Initial visibility: creator role + reviewer roles only (before approval)
# Management/other teams cannot see the PPD until it is Approved
INITIAL_REVIEWER_ROLES = ["fd", "pm"]   # the two roles assigned review tasks
INITIAL_VISIBLE_ROLES  = {"admin", "source", "fd", "pm"}  # always visible from day 1

# Roles that count as "reviewers" who can Approve/Rework
REVIEWER_ROLES = {"admin", "fd", "pm", "rd_head", "mgmt", "ceo", "regulatory", "marketing", "sa"}

# Roles that are "task owners" (responsible for doing the work, not reviewing)
TASK_OWNER_ROLES = {"source", "packaging", "adl", "pmsa", "production"}

# Roles that gain access ONLY after a PPD is Approved
MGMT_ROLES = {"mgmt", "ceo", "rd_head", "regulatory", "marketing", "sa",
              "packaging", "adl", "pmsa", "production"}

# Default reviewers list (R&D/F&D and PM)
DEFAULT_REVIEWERS = [
    {"role": "fd",  "team_label": "R&D / F&D Team",    "head_name": "", "status": "Pending", "comment": "", "updated_at": ""},
    {"role": "pm",  "team_label": "Project Management", "head_name": "", "status": "Pending", "comment": "", "updated_at": ""},
]


def _ist_now_iso() -> str:
    """Return current IST time as ISO string."""
    return datetime.now(IST).isoformat()


def _ppd_out(p: PPDSubmission) -> dict:
    return {
        "id":                   p.id,
        "ppd_id":               p.ppd_id,
        "project_name":         p.project_name,
        "ppd_title":            p.ppd_title or "",
        "brand":                p.brand,
        "product_category":     p.product_category,
        "target_consumer":      p.target_consumer,
        "market_segment":       p.market_segment,
        "expected_launch":      p.expected_launch,
        "objective":            p.objective,
        "key_benefits":         p.key_benefits,
        "status":               p.status,
        "ppd_version":          p.ppd_version,
        "teams_involved":       p.teams_involved,
        "full_teams_involved":  p.full_teams_involved or p.teams_involved or ALL_ROLES,
        "created_by":           p.created_by,
        "created_by_email":     p.created_by_email,
        "created_by_role":      p.created_by_role,
        "reviewers":            p.reviewers or [],
        "mgmt_approvals":       p.mgmt_approvals or [],
        "created_at":           fmt_ist(p.created_at),
        "updated_at":           fmt_ist(p.updated_at),
    }


def _comment_out(c: PPDComment) -> dict:
    return {
        "id":               c.id,
        "ppd_id":           c.ppd_id,
        "user_name":        c.user_name,
        "user_role":        c.user_role,
        "comment":          c.comment,
        "action_tag":       c.action_tag,
        "attachment_url":   c.attachment_url,
        "attachment_name":  c.attachment_name,
        "rework_resolved":  bool(c.rework_resolved),
        "visible_to_roles": c.visible_to_roles,
        "created_at":       fmt_ist(c.created_at),
    }


def _involved_roles(p: PPDSubmission) -> list[str]:
    """Return the list of roles actively involved in this PPD."""
    return [r.strip() for r in (p.teams_involved or "admin").split(",") if r.strip()]


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
    Return PPDs visible to the current user.

    Visibility rules:
    - While Pending/Rework: only roles in teams_involved (creator + direct reviewers) can see it.
    - After Approved: teams_involved expands to all relevant roles.
    - admin always sees everything.
    """
    role = current_user.get("role", "fd")
    stmt = select(PPDSubmission)

    if role != "admin":
        # A PPD is visible when the user's role appears in teams_involved.
        # For Pending/Rework PPDs, teams_involved is narrow (source+fd+pm only).
        # For Approved PPDs, teams_involved is expanded to all roles.
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
    # Access follows teams_involved — narrow until Approved, full after
    if role != "admin" and role not in (p.teams_involved or "").split(","):
        raise HTTPException(403, "This PPD is not accessible to your role yet")
    return _ppd_out(p)


# ── CREATE ────────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_ppd(
    body: PPDCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Source Team (or admin) creates a PPD.
    - Status starts as "Pending"
    - teams_involved is NARROW (admin + source + fd + pm) until the PPD is Approved
    - full_teams_involved is ALL_ROLES (expanded when PPD is Approved)
    - Auto-tasks created for R&D/F&D (fd) and PM
    - Notifications go only to directly involved roles
    """
    role = current_user.get("role", "fd")

    # Narrow initial visibility — only the creator's team + direct reviewers
    initial_teams = "admin,source,fd,pm"
    # Creator role always included
    if role and role not in initial_teams.split(","):
        initial_teams = f"{initial_teams},{role}"

    # Generate a global sequential ppd_id
    count_result = await db.execute(select(func.count(PPDSubmission.id)))
    seq = (count_result.scalar() or 0) + 1
    while True:
        ppd_id = f"PPD-ZW-{datetime.now(IST).year}-{str(seq).zfill(3)}"
        taken = (await db.execute(select(PPDSubmission.id).where(PPDSubmission.ppd_id == ppd_id))).scalar()
        if not taken:
            break
        seq += 1

    reviewers = list(DEFAULT_REVIEWERS)

    ppd = PPDSubmission(
        ppd_id=ppd_id,
        ppd_title=body.ppd_title or f"PPD #{seq} — {body.project_name}",
        project_name=body.project_name,
        brand=body.brand,
        product_category=body.product_category,
        target_consumer=body.target_consumer,
        market_segment=body.market_segment,
        expected_launch=body.expected_launch,
        objective=body.objective,
        key_benefits=body.key_benefits,
        status="Pending",
        ppd_version="v1.0",
        teams_involved=initial_teams,          # narrow — only directly involved
        full_teams_involved=ALL_ROLES,          # expanded after Approved
        created_by=current_user.get("name", ""),
        created_by_email=current_user.get("sub", ""),
        created_by_role=role,
        reviewers=reviewers,
        mgmt_approvals=[],
    )
    db.add(ppd)

    # Auto-assign review tasks to R&D/F&D and PM
    for target_role in ["fd", "pm"]:
        db.add(Task(
            title=f"Review PPD {ppd_id} — {body.project_name}",
            project_name=body.project_name,
            ppd_id=ppd_id,
            assigned_role=target_role,
            type="ppd_review",
            status="pending",
            priority="High",
            due_label="Today",
        ))

    notify_roles_list = list(set(initial_teams.split(",")) | {"fd", "pm"})

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="CREATE",
        action_label=f"created PPD {ppd_id}: {body.project_name}",
        entity=ppd_id,
        involved_roles=initial_teams,
        time_ago="just now",
    ))

    await notify_roles(
        db,
        roles=notify_roles_list,
        title=f"New PPD Created: {body.project_name}",
        message=(
            f"{current_user.get('name','User')} created PPD {ppd_id}: {body.project_name}. "
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
    result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "PPD not found")

    role = current_user.get("role", "fd")
    # Access follows teams_involved — narrow until Approved, full after
    if role != "admin" and role not in (p.teams_involved or "").split(","):
        raise HTTPException(403, "You are not assigned to this PPD")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}

    if "status" in updates:
        new_status = updates["status"]
        # Only admin can freely set status via this endpoint
        if new_status == "Approved" and role not in REVIEWER_ROLES | {"admin"}:
            raise HTTPException(403, "Only reviewers or admin can approve a PPD")
        if new_status == "Rework" and role not in REVIEWER_ROLES | {"admin"}:
            raise HTTPException(403, "Only reviewers or admin can send a PPD for rework")

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

    change_parts = []
    if "status" in updates:    change_parts.append(f"status → {updates['status']}")
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

    target_roles = _involved_roles(p)
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


# ── REVIEWER STATUS UPDATE (Approve / Rework) ────────────────────────────────

@router.patch("/{ppd_id}/reviewers")
async def update_reviewers(
    ppd_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update reviewer status for a PPD.
    body: { reviewers: [{role, team_label, head_name, status, comment}] }
    Allowed statuses: Pending, Rework, Approved
    """
    result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "PPD not found")

    role = current_user.get("role", "fd")
    new_reviewers = body.get("reviewers", [])
    ALLOWED_REVIEW_STATUSES = {"Pending", "Rework", "Approved"}

    if role == "admin":
        p.reviewers = copy.deepcopy(new_reviewers)
        flag_modified(p, "reviewers")
    else:
        if role not in REVIEWER_ROLES:
            raise HTTPException(403, "Your role cannot update reviewer status on this PPD")

        current_reviewers = copy.deepcopy(p.reviewers or [])
        my_index = next((i for i, r in enumerate(current_reviewers) if r.get("role") == role), None)
        if my_index is None:
            raise HTTPException(403, "Your role is not in the reviewer list for this PPD")

        new_status = None
        for r in current_reviewers:
            if r.get("role") == role:
                for nr in new_reviewers:
                    if nr.get("role") == role:
                        ns = nr.get("status", r.get("status"))
                        if ns not in ALLOWED_REVIEW_STATUSES:
                            raise HTTPException(400, f"Invalid review status '{ns}'. Must be one of: Pending, Rework, Approved")
                        r["status"]     = ns
                        r["comment"]    = nr.get("comment", r.get("comment", ""))
                        r["updated_at"] = _ist_now_iso()
                        new_status = r["status"]
                        break

        p.reviewers = current_reviewers
        flag_modified(p, "reviewers")

        # Update PPD-level status to match reviewer decision
        if new_status == "Approved":
            all_approved = all(r.get("status") == "Approved" for r in current_reviewers)
            if all_approved:
                p.status = "Approved"
                # Expand visibility to all teams now that PPD is Approved
                full_teams = p.full_teams_involved or ALL_ROLES
                p.teams_involved = full_teams
                flag_modified(p, "teams_involved")
                await notify_roles(
                    db,
                    roles=full_teams.split(","),
                    title=f"PPD Approved: {p.project_name}",
                    message=(
                        f"All reviewers approved PPD {ppd_id}. "
                        f"The PPD is now marked Approved and visible to all teams."
                    ),
                    action_type="ppd_approved",
                    entity_id=ppd_id,
                    entity_name=p.project_name,
                    created_by=current_user.get("name", ""),
                )
            else:
                pending_roles = [r.get("role") for r in current_reviewers if r.get("status") != "Approved"]
                if pending_roles:
                    await notify_roles(
                        db,
                        roles=pending_roles,
                        title=f"PPD Review Reminder: {p.project_name}",
                        message=(
                            f"{current_user.get('name','User')} approved PPD {ppd_id}. "
                            f"Your review is still pending."
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

    await db.commit()
    return {"ok": True, "reviewers": p.reviewers}


# ── REWORK: Reviewer sends rework request ─────────────────────────────────────

@router.post("/{ppd_id}/rework")
async def request_rework(
    ppd_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Reviewer requests rework on a PPD.
    body: { comment: "...", notify_roles: ["source", "fd"] (optional override) }
    - PPD status set to "Rework"
    - Rework comment stored, visible only to involved roles
    - Notification sent only to task owners / involved parties
    """
    result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "PPD not found")

    role = current_user.get("role", "fd")
    if role not in REVIEWER_ROLES and role != "admin":
        raise HTTPException(403, "Only reviewers or admin can request rework on a PPD")

    rework_comment = (body.get("comment") or "").strip()
    if not rework_comment:
        raise HTTPException(400, "A rework comment explaining what needs to be fixed is required")

    # Determine who should receive the rework notification
    # By default: the PPD creator (source team) + any task owners assigned to this PPD
    involved = _involved_roles(p)
    # Focus notification on task owners and the creator
    task_result = await db.execute(
        select(Task).where(Task.ppd_id == ppd_id, Task.status.in_(["pending", "rework"]))
    )
    active_tasks = task_result.scalars().all()
    task_owner_roles = list({t.assigned_role for t in active_tasks if t.assigned_role})
    # Always include creator role
    if p.created_by_role and p.created_by_role not in task_owner_roles:
        task_owner_roles.append(p.created_by_role)
    # Include "source" always
    if "source" not in task_owner_roles:
        task_owner_roles.append("source")
    # If explicit override provided
    if body.get("notify_roles"):
        task_owner_roles = [r for r in body["notify_roles"] if r in involved]

    # Set PPD status
    p.status = "Rework"

    # Update reviewer entry
    current_reviewers = copy.deepcopy(p.reviewers or [])
    my_index = next((i for i, r in enumerate(current_reviewers) if r.get("role") == role), None)
    if my_index is not None:
        current_reviewers[my_index]["status"]     = "Rework"
        current_reviewers[my_index]["comment"]    = rework_comment
        current_reviewers[my_index]["updated_at"] = _ist_now_iso()
        p.reviewers = current_reviewers
        flag_modified(p, "reviewers")

    # Store rework comment — visible only to involved roles
    visible_roles_str = ",".join(set(task_owner_roles + [role]))
    comment_obj = PPDComment(
        ppd_id=ppd_id,
        user_name=current_user.get("name", ""),
        user_role=role,
        comment=rework_comment,
        action_tag="rework",
        rework_resolved=False,
        visible_to_roles=visible_roles_str,
    )
    db.add(comment_obj)

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="REWORK",
        action_label=f"requested rework on PPD {ppd_id}: {rework_comment[:80]}",
        entity=ppd_id,
        involved_roles=",".join(task_owner_roles),
        time_ago="just now",
    ))

    # Notify ONLY the relevant task owners
    await notify_roles(
        db,
        roles=task_owner_roles,
        title=f"🔁 Rework Required: {p.project_name}",
        message=(
            f"{current_user.get('name','User')} ({role.upper()}) has sent PPD {ppd_id} for rework. "
            f"Reason: {rework_comment}"
        ),
        action_type="ppd_rework",
        entity_id=ppd_id,
        entity_name=p.project_name,
        created_by=current_user.get("name", ""),
    )

    await db.commit()
    await db.refresh(comment_obj)
    return {
        "ok": True,
        "status": p.status,
        "comment_id": comment_obj.id,
        "notified_roles": task_owner_roles,
    }


# ── REWORK DONE: Task owner confirms rework completed ─────────────────────────

@router.post("/{ppd_id}/rework-done")
async def confirm_rework_done(
    ppd_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Task owner confirms rework is completed and resubmits for reviewer.
    body: { reply_comment: "Changes completed — ..." }
    - Adds a rework_done comment (visible to reviewer + task owner)
    - Sets PPD status back to "Pending"
    - Notifies the original reviewer(s)
    """
    result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "PPD not found")

    if p.status != "Rework":
        raise HTTPException(400, f"PPD is not in Rework status (current: {p.status})")

    role = current_user.get("role", "fd")
    involved = _involved_roles(p)
    if role not in involved and role != "admin":
        raise HTTPException(403, "You are not assigned to this PPD")

    reply_comment = (body.get("reply_comment") or "").strip()
    if not reply_comment:
        raise HTTPException(400, "A reply comment confirming the changes is required")

    # Find who sent the rework (reviewer roles)
    reviewer_roles_for_notif = [r.get("role") for r in (p.reviewers or []) if r.get("status") == "Rework"]
    if not reviewer_roles_for_notif:
        # Fallback: notify all reviewer roles
        reviewer_roles_for_notif = list(REVIEWER_ROLES & set(involved))

    # Mark all open rework comments as resolved
    rework_comments_result = await db.execute(
        select(PPDComment).where(
            PPDComment.ppd_id == ppd_id,
            PPDComment.action_tag == "rework",
            PPDComment.rework_resolved == False,  # noqa
        )
    )
    for rc in rework_comments_result.scalars().all():
        rc.rework_resolved = True

    # Restore reviewer status to Pending for a fresh review
    current_reviewers = copy.deepcopy(p.reviewers or [])
    for r in current_reviewers:
        if r.get("status") == "Rework":
            r["status"]     = "Pending"
            r["updated_at"] = _ist_now_iso()
    p.reviewers = current_reviewers
    flag_modified(p, "reviewers")

    # Store reply comment — visible to reviewer + task owner
    visible_roles_str = ",".join(set(reviewer_roles_for_notif + [role]))
    reply_obj = PPDComment(
        ppd_id=ppd_id,
        user_name=current_user.get("name", ""),
        user_role=role,
        comment=reply_comment,
        action_tag="rework_done",
        rework_resolved=True,
        visible_to_roles=visible_roles_str,
    )
    db.add(reply_obj)

    # Reset PPD status to Pending for re-review
    p.status = "Pending"

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="REWORK_DONE",
        action_label=f"confirmed rework completed on PPD {ppd_id}",
        entity=ppd_id,
        involved_roles=",".join(reviewer_roles_for_notif + [role]),
        time_ago="just now",
    ))

    # Notify the reviewer(s) that rework is done
    await notify_roles(
        db,
        roles=reviewer_roles_for_notif,
        title=f"✅ Rework Completed: {p.project_name}",
        message=(
            f"{current_user.get('name','User')} confirmed rework is done on PPD {ppd_id}. "
            f"Please review and approve. Note: {reply_comment}"
        ),
        action_type="ppd_rework_done",
        entity_id=ppd_id,
        entity_name=p.project_name,
        created_by=current_user.get("name", ""),
    )

    await db.commit()
    await db.refresh(reply_obj)
    return {
        "ok": True,
        "status": p.status,
        "notified_reviewers": reviewer_roles_for_notif,
    }


# ── COMMENTS ──────────────────────────────────────────────────────────────────

@router.get("/{ppd_id}/comments")
async def list_comments(
    ppd_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return comments visible to the current user's role."""
    role = current_user.get("role", "fd")
    result = await db.execute(
        select(PPDComment).where(PPDComment.ppd_id == ppd_id).order_by(PPDComment.created_at.asc())
    )
    all_comments = result.scalars().all()
    visible = []
    for c in all_comments:
        # If visible_to_roles is NULL/empty, everyone can see it
        if not c.visible_to_roles:
            visible.append(_comment_out(c))
        elif role == "admin" or role in c.visible_to_roles.split(","):
            visible.append(_comment_out(c))
    return visible


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
    # Access follows teams_involved — narrow until Approved, full after
    if role != "admin" and role not in (p.teams_involved or "").split(","):
        raise HTTPException(403, "You are not assigned to this PPD")

    # Validate action_tag
    ALLOWED_TAGS = {"comment", "rework", "approve", "rework_done", "rework_reply"}
    action_tag = body.action_tag if body.action_tag in ALLOWED_TAGS else "comment"

    # Rework action via comment is not allowed — use POST /rework instead
    if action_tag == "rework" and role not in REVIEWER_ROLES | {"admin"}:
        raise HTTPException(403, "Only reviewers can post a rework action")

    # Approve action: update PPD status
    if action_tag == "approve" and role in REVIEWER_ROLES | {"admin"}:
        p.status = "Approved"

    comment = PPDComment(
        ppd_id=ppd_id,
        user_name=current_user.get("name", ""),
        user_role=role,
        comment=body.comment,
        action_tag=action_tag,
        attachment_url=body.attachment_url or None,
        attachment_name=body.attachment_name or None,
        rework_resolved=False,
        visible_to_roles=None,  # General comments are visible to all
    )
    db.add(comment)

    target_roles = _involved_roles(p)
    await notify_roles(
        db,
        roles=target_roles,
        title=f"New Comment on PPD: {p.project_name}",
        message=f"{current_user.get('name','User')} ({role}) posted a {action_tag} on {ppd_id}."
               + (f" [Attachment: {body.attachment_name}]" if body.attachment_name else ""),
        action_type="ppd_comment",
        entity_id=ppd_id,
        entity_name=p.project_name,
        created_by=current_user.get("name", ""),
    )

    await db.commit()
    await db.refresh(comment)
    return _comment_out(comment)


# ── FILE UPLOAD ────────────────────────────────────────────────────────────────

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "ppd")
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg", ".zip"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@router.post("/{ppd_id}/upload", status_code=201)
async def upload_attachment(
    ppd_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a file attachment for a PPD comment."""
    result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    if not result.scalars().first():
        raise HTTPException(404, "PPD not found")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type '{ext}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(400, "File exceeds 10 MB limit")

    save_dir = os.path.join(UPLOAD_DIR, ppd_id)
    os.makedirs(save_dir, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(save_dir, unique_name)

    async with aiofiles.open(save_path, "wb") as f:
        await f.write(contents)

    url = f"/uploads/ppd/{ppd_id}/{unique_name}"
    return {"ok": True, "url": url, "filename": file.filename, "size": len(contents)}


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

    teams = _involved_roles(p)
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


# ── TASKS ─────────────────────────────────────────────────────────────────────

@router.get("/tasks/mine")
async def get_my_tasks(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all pending/rework tasks assigned to the current user's role."""
    role = current_user.get("role", "fd")
    stmt = select(Task).where(Task.status.in_(["pending", "rework"]))
    if role not in ("admin", "mgmt", "ceo"):
        stmt = stmt.where(Task.assigned_role == role)
    stmt = stmt.order_by(Task.id.desc()).limit(50)
    result = await db.execute(stmt)
    tasks = result.scalars().all()
    return [
        {
            "id":            t.id,
            "title":         t.title,
            "project_name":  t.project_name,
            "project_id":    t.project_id,
            "task_id":       t.id,
            "task_type":     t.type,
            "assigned_role": t.assigned_role,
            "type":          t.type,
            "status":        t.status,
            "priority":      t.priority,
            "due_label":     t.due_label,
        }
        for t in tasks
    ]


@router.patch("/tasks/{task_id}/status")
async def update_task_status(
    task_id: int,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update status of a task by ID. Only Pending, Rework, Approved allowed."""
    new_status = (body.get("status") or "").strip()
    ALLOWED_TASK_STATUSES = {"pending", "rework", "approved"}
    if not new_status:
        raise HTTPException(400, "status is required")
    if new_status not in ALLOWED_TASK_STATUSES:
        raise HTTPException(400, f"Invalid status '{new_status}'. Must be one of: {', '.join(ALLOWED_TASK_STATUSES)}")

    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(404, "Task not found")

    role = current_user.get("role", "fd")
    if role not in ("admin", "mgmt", "ceo") and task.assigned_role != role:
        raise HTTPException(403, "You are not assigned to this task")

    task.status = new_status
    await db.commit()
    return {"ok": True}
