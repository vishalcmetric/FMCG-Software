"""
PPD (Product Development Plan) router.

Rules:
  - Admin can create a PPD for any project, update any field, change status, manage reviewers.
  - Any role in the project's teams_involved can view the PPD and post comments.
  - Only admin can change status to Approved / CEO Approved / Archived.
  - All mutations fire real-time notifications to all teams_involved roles.
  - The PPD inherits teams_involved from the parent Project so every relevant
    department automatically sees updates in their dashboard.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth import get_current_user, require_admin
from models import PPDCreate, PPDUpdate, PPDCommentCreate
from orm_models import PPDSubmission, PPDComment, Project, AuditLog
from notify import notify_roles
from datetime import datetime, timezone

router = APIRouter(prefix="/api/ppd", tags=["ppd"])

# Default set of reviewer teams for every new PPD
DEFAULT_REVIEWERS = [
    {"role": "marketing",   "team_label": "Marketing Team",         "head_name": "", "status": "Pending", "comment": "", "updated_at": ""},
    {"role": "fd",          "team_label": "R&D / F&D Team",         "head_name": "", "status": "Pending", "comment": "", "updated_at": ""},
    {"role": "regulatory",  "team_label": "Regulatory Team",        "head_name": "", "status": "Pending", "comment": "", "updated_at": ""},
    {"role": "packaging",   "team_label": "Packaging Team",         "head_name": "", "status": "Pending", "comment": "", "updated_at": ""},
    {"role": "sa",          "team_label": "Sales / GDSO Team",      "head_name": "", "status": "Pending", "comment": "", "updated_at": ""},
]


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
    Create a PPD linked to a project.
    Any role that is in the project's teams_involved can create a PPD,
    but admin can always create for any project.
    Reviewer list is seeded from DEFAULT_REVIEWERS; their head_name is
    populated from users table if records exist.
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

    # Build reviewer list — filter to only those in the project's teams
    proj_teams = set((project.teams_involved or "").split(","))
    reviewers = [r for r in DEFAULT_REVIEWERS if r["role"] in proj_teams or role == "admin"]

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
        status="Under Review",
        ppd_version="v1.0",
        teams_involved=project.teams_involved or "admin",
        created_by=current_user.get("name", ""),
        created_by_email=current_user.get("sub", ""),
        created_by_role=role,
        reviewers=reviewers,
    )
    db.add(ppd)

    # Auto-assign review tasks to R&D/F&D (fd) and PM (pm)
    from orm_models import Task
    for target_role in ["fd", "pm"]:
        db.add(Task(
            title=f"Review PPD {ppd_id} for {body.project_name}",
            project_name=body.project_name,
            project_id=body.project_id,
            assigned_role=target_role,
            type="ppd_review",
            status="pending",
            priority="High",
            due_label="Today"
        ))

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="CREATE",
        action_label=f"created PPD for project {body.project_id}: {body.project_name}",
        entity=ppd_id,
        involved_roles=project.teams_involved or "admin",
        time_ago="just now",
    ))

    target_roles = (project.teams_involved or "admin").split(",")
    await notify_roles(
        db,
        roles=target_roles,
        title=f"New PPD Created: {body.project_name}",
        message=f"{current_user.get('name','User')} created a PPD for {body.project_id} ({body.brand}). Assigned to PM & F&D for review.",
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
    Status changes to Approved / CEO Approved / Archived are role-managed.
    Any team member in teams_involved can update content fields (objective, etc.).
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
        if new_status == "CEO Approved" and role not in ("admin", "ceo"):
            raise HTTPException(403, "Only CEO Office or admin can approve final PPD")
        if new_status == "Submitted" and role not in ("admin", "source"):
            raise HTTPException(403, "Only Source Team or admin can submit a PPD for management approval")
        if new_status == "Under Review" and role not in ("admin", "pm", "source"):
            raise HTTPException(403, "Only Project Management, Source or admin can set PPD to Under Review")
        if new_status == "Rework" and role not in ("admin", "mgmt", "ceo", "rd_head"):
            raise HTTPException(403, "Only Management, CEO, R&D Head or admin can send PPD for rework")

        # If CEO Approved -> unlock Formulation phase in linked Project
        if new_status == "CEO Approved":
            proj_res = await db.execute(select(Project).where(Project.project_id == p.project_id))
            proj = proj_res.scalars().first()
            if proj:
                proj.status = "Formulation"
                proj.progress = max(proj.progress or 0, 30)

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
    Update the reviewer list for a PPD.
    Admin can set full list; team members can only update their own reviewer entry.
    body: { reviewers: [{role, team_label, head_name, status, comment}] }
    """
    result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "PPD not found")

    role = current_user.get("role", "fd")
    new_reviewers = body.get("reviewers", [])

    if role == "admin":
        p.reviewers = new_reviewers
    else:
        # Non-admin can only update their own entry
        current_reviewers = list(p.reviewers or [])
        for r in current_reviewers:
            if r.get("role") == role:
                # Find matching entry in new_reviewers
                for nr in new_reviewers:
                    if nr.get("role") == role:
                        r["status"]  = nr.get("status", r.get("status"))
                        r["comment"] = nr.get("comment", r.get("comment"))
                        r["updated_at"] = datetime.now(timezone.utc).isoformat()
                        break
        p.reviewers = current_reviewers

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

    # If action_tag triggers a status change — WBS role rules:
    # rework: admin, mgmt, ceo, rd_head can send back for rework
    # approve: mgmt/ceo can approve (mgmt → Approved, ceo → CEO Approved), admin can set either
    if body.action_tag == "rework" and role in ("admin", "mgmt", "ceo", "rd_head"):
        p.status = "Rework"
    elif body.action_tag == "approve":
        if role == "admin":
            p.status = "Approved"
        elif role == "mgmt":
            p.status = "Approved"
        elif role == "ceo":
            p.status = "CEO Approved"

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
