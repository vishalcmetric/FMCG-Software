"""
PPD (Product Development Plan) router — 6-stage approval workflow.

Stage 1 — Initial Review (fd + pm)
  status: Pending / Rework
  → When ALL fd+pm approve: status = ReviewerApproved

Stage 2 — Source Submission
  status: ReviewerApproved
  → Source Team clicks "Submit for Approval"
  → assigns: rd_head, marketing_head, sales_head, gdso_head, regulatory, cfo tasks
  → status = MgmtReview

Stage 3 — Management Committee Review (6 members)
  rd_head, marketing_head, sales_head, gdso_head, regulatory, cfo
  status: MgmtReview / Rework
  → Each role approves INDEPENDENTLY (no cascading)
  → When ALL six approve: status = MgmtApproved
    → assigns ceo task

Stage 4 — Final Approval (ceo only)
  status: FinalReview / Rework
  → CEO approves
  → When approved: status = Approved, visibility expanded to ALL_ROLES

Rework at any stage:
  - Sets status = Rework
  - Stores rework_from_stage = "initial" | "mgmt" | "final"
  - Sends notification ONLY to the task owner (source team)
  - rework-done resets status to the appropriate stage's pre-rework value

Key invariants:
  - No stage is skipped automatically
  - One role's approval NEVER approves another role's task
  - Management/CFO/CEO never get notifications until their stage is reached
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified
import copy, os, uuid, aiofiles
from database import get_db, now_ist_naive, IST, fmt_ist
from auth import get_current_user, require_admin
from models import PPDCreate, PPDUpdate, PPDCommentCreate
from orm_models import PPDSubmission, PPDComment, AuditLog, Task, Notification, User, MasterConfig
from ppd_fields import draft_with_legacy, apply_draft, DRAFT_KEYS
from sqlalchemy import or_, cast, String
import re
import html as _html
from sqlalchemy import delete as sa_delete
from notify import notify_roles
from datetime import datetime

router = APIRouter(prefix="/api/ppd", tags=["ppd"])

# ── Role constants ─────────────────────────────────────────────────────────────

# Full role list — used for post-approval visibility
ALL_ROLES = "admin,source,pm,fd,fd_member,rd_team,regulatory_team,rd_head,marketing_head,sales_head,gdso_head,regulatory,cfo,packaging,adl,pmsa,sa,ceo,production"

# Stage 1: Initial review — PM + R&D Head + F&D Team Head (R&D and F&D are separate teams)
INITIAL_VISIBLE_ROLES  = {"admin", "source", "fd", "pm", "rd_head"}   # PPD visible once submitted
INITIAL_REVIEWER_ROLES = ["pm", "rd_head", "fd"]                       # get tasks on submission

# Team heads assign members of their own team; members only comment (never approve / rework)
TEAM_ASSIGN = {"rd_head": ("rd_assignees", "rd_team"), "fd": ("fd_assignees", "fd_member")}
MEMBER_ASSIGNEE_FIELD = {"rd_team": "rd_assignees", "fd_member": "fd_assignees"}

# Stage 3: Management Committee — 6 members assigned when Source submits
MGMT_ROLES = ["rd_head", "marketing_head", "sales_head", "gdso_head", "regulatory", "cfo"]

# Stage 4: Final approver — CEO only (after ALL 6 mgmt members approve)
FINAL_APPROVER_ROLES = ["ceo"]

# Combined sets for permission checks
ALL_REVIEWER_ROLES = set(INITIAL_REVIEWER_ROLES) | set(MGMT_ROLES) | set(FINAL_APPROVER_ROLES) | {"admin"}
TASK_OWNER_ROLES   = {"source", "packaging", "adl", "pmsa", "production"}

# Default Stage-1 reviewers (fd + pm)
DEFAULT_REVIEWERS = [
    {"role": "rd_head", "team_label": "R&D Head",      "status": "Pending", "comment": "", "updated_at": ""},
    {"role": "fd",  "team_label": "F&D Team Head",     "status": "Pending", "comment": "", "updated_at": ""},
    {"role": "pm",  "team_label": "Project Management Team", "status": "Pending", "comment": "", "updated_at": ""},
]

# Stage-3 Management Committee reviewer defaults (6 members)
DEFAULT_MGMT_APPROVALS = [
    {"role": "rd_head",       "team_label": "R&D Head",          "status": "Pending", "comment": "", "updated_at": ""},
    {"role": "marketing_head","team_label": "Marketing Head",     "status": "Pending", "comment": "", "updated_at": ""},
    {"role": "sales_head",    "team_label": "Sales Head",         "status": "Pending", "comment": "", "updated_at": ""},
    {"role": "gdso_head",     "team_label": "GDSO Head",          "status": "Pending", "comment": "", "updated_at": ""},
    {"role": "regulatory",    "team_label": "Regulatory Head",    "status": "Pending", "comment": "", "updated_at": ""},
    {"role": "cfo",           "team_label": "CFO",                "status": "Pending", "comment": "", "updated_at": ""},
]

# Stage-4 Final approver defaults (CEO only)
DEFAULT_FINAL_APPROVALS = [
    {"role": "ceo", "team_label": "CEO",  "status": "Pending", "comment": "", "updated_at": ""},
]

# Map each stage name → the status PPD should restore to when rework is resolved
REWORK_RESTORE_STATUS = {
    "initial": "Pending",
    "mgmt":    "MgmtReview",
    "final":   "FinalReview",
}

# Teams that should be included in teams_involved at each stage
TEAMS_AT_STAGE = {
    "initial":  set(INITIAL_VISIBLE_ROLES),
    "mgmt":     set(INITIAL_VISIBLE_ROLES) | set(MGMT_ROLES),
    "final":    set(INITIAL_VISIBLE_ROLES) | set(MGMT_ROLES) | set(FINAL_APPROVER_ROLES),
    "approved": set(ALL_ROLES.split(",")),
}


def _ist_now_iso() -> str:
    return datetime.now(IST).isoformat()


async def _ensure_brand(db: AsyncSession, brand: str) -> str:
    """Reuse an existing master-config brand (case-insensitive) or register a new one.
    Returns the canonical label so PPDs never store duplicate spellings of a brand."""
    label = (brand or "").strip()
    if not label:
        return label
    rows = (await db.execute(select(MasterConfig).where(MasterConfig.config_type == "brand"))).scalars().all()
    for r in rows:
        if (r.label or "").strip().lower() == label.lower():
            if not r.is_active:
                r.is_active = True
            return r.label
    base = re.sub(r"[^a-z0-9]+", "_", label.lower()).strip("_") or "brand"
    keys, key, n = {r.key for r in rows}, base, 2
    while key in keys:
        key, n = f"{base}_{n}", n + 1
    db.add(MasterConfig(config_type="brand", key=key, label=label, meta={}, is_active=True,
                        sort_order=max([r.sort_order or 0 for r in rows] or [0]) + 1))
    return label


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
        "draft_form":           draft_with_legacy(p),
        "rd_assignees":         p.rd_assignees or [],
        "fd_assignees":         p.fd_assignees or [],
        "status":               p.status,
        "ppd_version":          p.ppd_version,
        "teams_involved":       p.teams_involved,
        "full_teams_involved":  p.full_teams_involved or p.teams_involved or ALL_ROLES,
        "created_by":           p.created_by,
        "created_by_email":     p.created_by_email,
        "created_by_role":      p.created_by_role,
        "reviewers":            p.reviewers or [],
        "mgmt_approvals":       p.mgmt_approvals or [],
        "final_approvals":      p.final_approvals or [],
        "rework_from_stage":    p.rework_from_stage or "",
        "created_at":           fmt_ist(p.created_at),
        "updated_at":           fmt_ist(p.updated_at),
    }


def _is_assigned(p: PPDSubmission, user: dict) -> bool:
    field = MEMBER_ASSIGNEE_FIELD.get(user.get("role", ""))
    email = (user.get("sub") or "").lower()
    return bool(field and email and any((m.get("email") or "").lower() == email for m in (getattr(p, field) or [])))


def _can_access(p: PPDSubmission, user: dict) -> bool:
    role = user.get("role", "fd")
    return role == "admin" or role in (p.teams_involved or "").split(",") or _is_assigned(p, user)


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
        "attachments":      c.attachments or ([{"url": c.attachment_url, "filename": c.attachment_name}] if c.attachment_url else []),
        "user_email":       c.user_email or "",
        "rework_resolved":  bool(c.rework_resolved),
        "visible_to_roles": c.visible_to_roles,
        "created_at":       fmt_ist(c.created_at),
    }


def _involved_roles(p: PPDSubmission) -> list[str]:
    return [r.strip() for r in (p.teams_involved or "admin").split(",") if r.strip()]


def _teams_str(role_set: set) -> str:
    """Sort and join a set of roles into a comma-separated string."""
    return ",".join(sorted(role_set))


# ppd_comments.comment is MySQL TEXT = 65,535 bytes; keep a margin (frontend uses the same limit)
COMMENT_MAX_BYTES = 65000


def _check_comment_len(text: str) -> None:
    if len((text or "").encode("utf-8")) > COMMENT_MAX_BYTES:
        raise HTTPException(422, f"Comment is too long — maximum {COMMENT_MAX_BYTES:,} characters (including formatting). "
                                 "Please shorten it or attach the content as a file.")


def _plain(text: str) -> str:
    """Rich-text HTML → plain text (for notifications / reviewer entries)."""
    return re.sub(r"\s+", " ", _html.unescape(re.sub(r"<[^>]+>", " ", text or ""))).strip()


# ── LIST ──────────────────────────────────────────────────────────────────────

@router.get("")
async def list_ppds(
    q:      str = Query("", description="Search by name / ID"),
    status: str = Query("all"),
    brand:  str = Query("all"),
    all:    str = Query("", description="Pass 'all' to skip teams_involved filter (for artwork/cross-module use)"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    role = current_user.get("role", "fd")
    stmt = select(PPDSubmission)

    # Skip teams_involved filter when explicitly requested (e.g. packaging creating artwork)
    if role != "admin" and all != "all":
        field = MEMBER_ASSIGNEE_FIELD.get(role)
        email = (current_user.get("sub") or "").lower()
        if field and email:
            stmt = stmt.where(
                PPDSubmission.teams_involved.contains(role)
                | cast(getattr(PPDSubmission, field), String).contains(f'"{email}"')
            )
        else:
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
            | PPDSubmission.ppd_title.ilike(pattern)
            | PPDSubmission.brand.ilike(pattern)
            | or_(*[getattr(PPDSubmission, k).ilike(pattern) for k in DRAFT_KEYS if k != "date"])
        )

    stmt = stmt.order_by(PPDSubmission.updated_at.desc()).limit(100)
    result = await db.execute(stmt)
    return [_ppd_out(p) for p in result.scalars().all()]


# ── GET ONE ───────────────────────────────────────────────────────────────────

@router.get("/team-options")
async def team_options(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Active users for Draft PPD 'Project Team' dropdowns (non-admin safe: name/role only)."""
    from routers.auth import DEMO_USERS   # login also accepts these accounts when not in the users table
    result = await db.execute(select(User).order_by(User.name))
    members = {
        ((u.email or "").lower(), u.role): {"id": u.id, "name": u.name, "role": u.role, "email": (u.email or "").lower()}
        for u in result.scalars().all()
        if (getattr(u, "status", "Active") or "Active") == "Active"
    }
    for email, d in DEMO_USERS.items():
        members.setdefault((email, d["role"]), {"id": email, "name": d["name"], "role": d["role"], "email": email})
    # Anyone who has signed in as an R&D Team / F&D Team Member is assignable in that role
    logins = (await db.execute(
        select(AuditLog.user_email, AuditLog.user_name, AuditLog.involved_roles)
        .where(AuditLog.action == "LOGIN").where(AuditLog.involved_roles.in_(["rd_team", "fd_member"]))
    )).all()
    for email, name, mrole in logins:
        email = (email or "").lower()
        if email:
            members.setdefault((email, mrole), {"id": f"{email}:{mrole}", "name": name or email, "role": mrole, "email": email})
    return sorted(members.values(), key=lambda m: (m["name"] or "").lower())


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
    if not _can_access(p, current_user):
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
    - Status: Pending
    - Assigns fd + pm review tasks
    - teams_involved: narrow (admin, source, fd, pm)
    - Management / CFO / CEO get NO notification yet
    """
    role = current_user.get("role", "fd")
    body.brand = await _ensure_brand(db, body.brand)
    if not body.project_name.strip() or not body.brand:
        raise HTTPException(422, "Project Name and Brand are required")

    initial_teams = {"admin", role} if not body.submit else set(INITIAL_VISIBLE_ROLES) | {role}

    count_result = await db.execute(select(func.count(PPDSubmission.id)))
    seq = (count_result.scalar() or 0) + 1
    while True:
        ppd_id = f"PPD-ZW-{datetime.now(IST).year}-{str(seq).zfill(3)}"
        taken = (await db.execute(select(PPDSubmission.id).where(PPDSubmission.ppd_id == ppd_id))).scalar()
        if not taken:
            break
        seq += 1

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
        status="Pending" if body.submit else "Draft",
        ppd_version="v1.0",
        teams_involved=_teams_str(initial_teams),
        full_teams_involved=ALL_ROLES,
        created_by=current_user.get("name", ""),
        created_by_email=current_user.get("sub", ""),
        created_by_role=role,
        reviewers=list(DEFAULT_REVIEWERS),
        mgmt_approvals=[],
        final_approvals=[],
        rework_from_stage=None,
    )
    if body.draft_form:
        apply_draft(ppd, body.draft_form.model_dump())
    db.add(ppd)

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="CREATE",
        action_label=f"created PPD {ppd_id}: {body.project_name}",
        entity=ppd_id,
        involved_roles=_teams_str(initial_teams),
        time_ago="just now",
    ))

    if body.submit:
        await _start_initial_review(db, ppd, current_user)

    await db.commit()
    await db.refresh(ppd)
    return _ppd_out(ppd)


async def _start_initial_review(db: AsyncSession, p: PPDSubmission, current_user: dict) -> None:
    """Draft -> Pending: send the PPD to PM, R&D Head and F&D Team Head (Stage 1)."""
    p.status = "Pending"
    p.teams_involved = _teams_str(set(INITIAL_VISIBLE_ROLES) | {p.created_by_role or "source"})
    p.reviewers = copy.deepcopy(DEFAULT_REVIEWERS)
    flag_modified(p, "reviewers")
    for target_role in INITIAL_REVIEWER_ROLES:
        db.add(Task(
            title=f"Review PPD {p.ppd_id} — {p.project_name}",
            project_name=p.project_name,
            ppd_id=p.ppd_id,
            assigned_role=target_role,
            type="ppd_review",
            status="pending",
            priority="High",
            due_label="Today",
        ))
    await notify_roles(
        db,
        roles=list(INITIAL_VISIBLE_ROLES),
        title=f"New PPD Submitted: {p.project_name}",
        message=(
            f"{current_user.get('name','User')} submitted PPD {p.ppd_id}: {p.project_name}. "
            f"Project Management, R&D Head and F&D Team Head have been assigned review tasks."
        ),
        action_type="ppd_created",
        entity_id=p.ppd_id,
        entity_name=p.project_name,
        created_by=current_user.get("name", ""),
    )


@router.post("/{ppd_id}/submit")
async def submit_ppd(
    ppd_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Source Team submits a Draft PPD to PM + R&D Head + F&D Team Head."""
    p = (await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))).scalars().first()
    if not p:
        raise HTTPException(404, "PPD not found")
    role = current_user.get("role", "")
    if role not in ("admin", "source") and (current_user.get("sub") or "") != (p.created_by_email or ""):
        raise HTTPException(403, "Only the Source Team can submit this PPD")
    if p.status != "Draft":
        raise HTTPException(400, f"Only Draft PPDs can be submitted (current status: {p.status})")
    await _start_initial_review(db, p, current_user)
    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="SUBMIT",
        action_label=f"submitted PPD {ppd_id} for Stage-1 review",
        entity=ppd_id,
        involved_roles=p.teams_involved,
        time_ago="just now",
    ))
    await db.commit()
    await db.refresh(p)
    return _ppd_out(p)


@router.patch("/{ppd_id}/assign-team")
async def assign_team(
    ppd_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """R&D Head assigns R&D Team members; F&D Team Head assigns F&D Team members.
    body: { team: "rd" | "fd", members: [{email, name}] }"""
    p = (await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))).scalars().first()
    if not p:
        raise HTTPException(404, "PPD not found")
    role = current_user.get("role", "")
    team = body.get("team") or {"rd_head": "rd", "fd": "fd"}.get(role)
    head_role = {"rd": "rd_head", "fd": "fd"}.get(team)
    if not head_role or (role != "admin" and role != head_role):
        raise HTTPException(403, "Only the R&D Head (R&D Team) or F&D Team Head (F&D Team) can assign members")
    if p.status == "Draft":
        raise HTTPException(400, "Submit the PPD before assigning team members")
    field, member_role = TEAM_ASSIGN[head_role]
    members, seen = [], set()
    for m in body.get("members") or []:
        email = (m.get("email") or "").strip().lower()
        if email and email not in seen:
            seen.add(email)
            members.append({"email": email, "name": m.get("name") or email, "assigned_at": _ist_now_iso(),
                            "assigned_by": current_user.get("name", "")})
    before = {(m.get("email") or "").lower() for m in (getattr(p, field) or [])}
    setattr(p, field, members)
    flag_modified(p, field)
    team_label = "R&D Team" if team == "rd" else "F&D Team"

    # Personal review task for each assigned member (shows in their "My Pending Tasks")
    open_tasks = (await db.execute(
        select(Task).where(Task.ppd_id == ppd_id).where(Task.type == "ppd_team_review")
        .where(Task.assigned_role == member_role).where(Task.status == "pending")
    )).scalars().all()
    for t in open_tasks:
        if (t.assigned_to_email or "") not in seen:
            await db.delete(t)
    have = {t.assigned_to_email for t in open_tasks}
    for m in members:
        if m["email"] not in have:
            db.add(Task(
                title=f"Review PPD {ppd_id} — {p.project_name} ({team_label})",
                project_name=p.project_name, ppd_id=ppd_id,
                assigned_role=member_role, assigned_to_email=m["email"],
                type="ppd_team_review", status="pending", priority="High", due_label="Today",
            ))
    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="UPDATE",
        action_label=f"assigned {team_label} on PPD {ppd_id}: " + (", ".join(m["name"] for m in members) or "none"),
        entity=ppd_id,
        involved_roles=p.teams_involved or "admin",
        time_ago="just now",
    ))
    if members:
        await notify_roles(
            db, roles=[member_role],
            title=f"PPD assigned for review: {p.project_name}",
            message=f"{current_user.get('name','User')} assigned {', '.join(m['name'] for m in members)} "
                    f"({team_label}) to review PPD {ppd_id}. Assigned members can add comments.",
            action_type="ppd_assigned", entity_id=ppd_id, entity_name=p.project_name,
            created_by=current_user.get("name", ""),
        )
    await db.commit()
    await db.refresh(p)
    return _ppd_out(p)


# ── UPDATE (content edits) ────────────────────────────────────────────────────

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
    if role != "admin" and role not in (p.teams_involved or "").split(","):
        raise HTTPException(403, "You are not assigned to this PPD")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "brand" in updates:
        updates["brand"] = await _ensure_brand(db, updates["brand"])
        if not updates["brand"]:
            raise HTTPException(422, "Brand cannot be empty")
    if "project_name" in updates and not updates["project_name"].strip():
        raise HTTPException(422, "Project Name cannot be empty")

    # Bump version on content edits
    content_fields = {"project_name", "brand", "draft_form", "objective", "key_benefits", "product_category", "target_consumer", "market_segment", "expected_launch"}
    if any(f in updates for f in content_fields):
        try:
            major, minor = p.ppd_version.lstrip("v").split(".")
            p.ppd_version = f"v{major}.{int(minor)+1}"
        except Exception:
            pass

    draft = updates.pop("draft_form", None)
    if draft is not None:
        apply_draft(p, draft)
    for field, value in updates.items():
        setattr(p, field, value)

    # When admin overrides status to a terminal state, close all pending tasks for this PPD
    new_status = updates.get("status", "")
    if new_status in ("Completed", "Approved"):
        task_rows = await db.execute(
            select(Task).where(Task.ppd_id == ppd_id).where(Task.status.in_(["pending", "rework"]))
        )
        for t in task_rows.scalars().all():
            t.status = "approved"

    change_parts = []
    if new_status:
        change_parts.append(f"status → {new_status}")
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

    await notify_roles(
        db,
        roles=_involved_roles(p),
        title=f"PPD Updated: {p.project_name}",
        message=f"{current_user.get('name','User')} updated {ppd_id} ({p.brand}) — {change_summary}.",
        action_type="ppd_updated",
        entity_id=ppd_id,
        entity_name=p.project_name,
        created_by=current_user.get("name", ""),
    )

    await db.commit()
    return {"ok": True, "ppd_version": p.ppd_version}


# ── STAGE 1: Initial Reviewer Status Update (fd / pm) ─────────────────────────

@router.patch("/{ppd_id}/reviewers")
async def update_reviewers(
    ppd_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    fd / pm update their own review status.
    body: { reviewers: [{role, status, comment}] }

    - Only the caller's own entry is updated (no cascading).
    - When ALL fd+pm entries are 'Approved': status → ReviewerApproved.
    - Rework is sent via POST /rework instead.
    """
    result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "PPD not found")

    role = current_user.get("role", "fd")
    new_reviewers = body.get("reviewers", [])
    ALLOWED = {"Pending", "Rework", "Approved"}

    if p.status == "Approved":
        raise HTTPException(400, "This PPD is already approved — no further approval or rework is possible")
    if role != "admin" and not (p.status == "Pending" or (p.status == "Rework" and (p.rework_from_stage or "initial") == "initial")):
        raise HTTPException(400, "Stage-1 approval is not available for this PPD at its current stage")

    if role == "admin":
        p.reviewers = copy.deepcopy(new_reviewers)
        flag_modified(p, "reviewers")
    else:
        if role not in set(INITIAL_REVIEWER_ROLES) | {"admin"}:
            raise HTTPException(403, "Only Stage-1 reviewers (PM, R&D Head, F&D Team Head) can approve")

        current_reviewers = copy.deepcopy(p.reviewers or [])
        my_entry = next((r for r in current_reviewers if r.get("role") == role), None)
        if my_entry is None:
            raise HTTPException(403, "Your role is not in the reviewer list for this PPD")
        if my_entry.get("status") == "Approved":
            raise HTTPException(400, "You have already approved this PPD")

        new_status = None
        for r in current_reviewers:
            if r.get("role") == role:
                for nr in new_reviewers:
                    if nr.get("role") == role:
                        ns = nr.get("status", r.get("status"))
                        if ns not in ALLOWED:
                            raise HTTPException(400, f"Invalid status '{ns}'")
                        r["status"]     = ns
                        r["comment"]    = nr.get("comment", r.get("comment", ""))
                        r["updated_at"] = _ist_now_iso()
                        new_status = ns
                        break

        p.reviewers = current_reviewers
        flag_modified(p, "reviewers")

        if new_status == "Approved":
            # Mark this role's pending task as approved so dashboard count drops
            task_upd = await db.execute(
                select(Task)
                .where(Task.ppd_id == ppd_id)
                .where(Task.assigned_role == role)
                .where(Task.status == "pending")
                .where(Task.type == "ppd_review")
            )
            for t in task_upd.scalars().all():
                t.status = "approved"

            all_approved = all(r.get("status") == "Approved" for r in current_reviewers)
            if all_approved:
                # ALL fd+pm approved → ReviewerApproved; Source must submit
                p.status = "ReviewerApproved"
                await notify_roles(
                    db,
                    roles=list(INITIAL_VISIBLE_ROLES),
                    title=f"Initial Review Complete: {p.project_name}",
                    message=(
                        f"All initial reviewers approved PPD {ppd_id}. "
                        f"Source Team: click 'Submit for Approval' to send to Management Committee."
                    ),
                    action_type="ppd_reviewed",
                    entity_id=ppd_id,
                    entity_name=p.project_name,
                    created_by=current_user.get("name", ""),
                )
            else:
                # Notify the remaining pending reviewers
                pending = [r.get("role") for r in current_reviewers if r.get("status") != "Approved"]
                if pending:
                    await notify_roles(
                        db,
                        roles=pending,
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
        action_label=f"updated Stage-1 reviewer status on PPD {ppd_id}",
        entity=ppd_id,
        involved_roles=p.teams_involved or "admin",
        time_ago="just now",
    ))

    await db.commit()
    return {"ok": True, "reviewers": p.reviewers, "status": p.status}


# ── STAGE 2: Source Team submits to Management Committee ──────────────────────

@router.post("/{ppd_id}/submit-for-approval")
async def submit_for_approval(
    ppd_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Source Team (or admin) explicitly submits a ReviewerApproved PPD.

    - PPD must be in 'ReviewerApproved' status
    - Only source / admin can call this
    - Assigns tasks to: rd_head, marketing_head, sales_head, gdso_head, regulatory, cfo
    - Sends notifications ONLY to those six roles
    - status → MgmtReview
    - teams_involved expanded to include mgmt roles
    """
    result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "PPD not found")

    role = current_user.get("role", "fd")
    if role not in ("source", "admin"):
        raise HTTPException(403, "Only the Source Team or admin can submit for approval")

    if p.status != "ReviewerApproved":
        raise HTTPException(
            400,
            f"PPD must be in 'ReviewerApproved' status (current: {p.status}). "
            f"Ensure all initial reviewers (R&D/F&D and PM) have approved first."
        )

    # Expand teams_involved to Stage-3
    current_teams = set((p.teams_involved or "").split(","))
    expanded = current_teams | set(MGMT_ROLES)
    p.teams_involved = _teams_str(expanded)
    p.status = "MgmtReview"

    # Initialise mgmt_approvals with Pending for each role (fresh slate)
    p.mgmt_approvals = list(DEFAULT_MGMT_APPROVALS)
    flag_modified(p, "mgmt_approvals")

    # Create review tasks for each mgmt role
    for mgmt_role in MGMT_ROLES:
        db.add(Task(
            title=f"Management Review: PPD {ppd_id} — {p.project_name}",
            project_name=p.project_name,
            ppd_id=ppd_id,
            assigned_role=mgmt_role,
            type="ppd_mgmt_approval",
            status="pending",
            priority="High",
            due_label="Today",
        ))

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="SUBMIT",
        action_label=f"submitted PPD {ppd_id} for Management Committee review",
        entity=ppd_id,
        involved_roles=p.teams_involved,
        time_ago="just now",
    ))

    # Notify ONLY the mgmt committee (rd_head, marketing_head, sales_head, gdso_head, regulatory, cfo)
    await notify_roles(
        db,
        roles=MGMT_ROLES,
        title=f"PPD Submitted for Your Review: {p.project_name}",
        message=(
            f"{current_user.get('name','User')} (Source Team) submitted PPD {ppd_id} "
            f"({p.project_name}) for management review. Please review and approve your assigned task."
        ),
        action_type="ppd_submitted",
        entity_id=ppd_id,
        entity_name=p.project_name,
        created_by=current_user.get("name", ""),
    )

    # Notify initial team that submission happened (no mgmt roles yet)
    await notify_roles(
        db,
        roles=list(INITIAL_VISIBLE_ROLES),
        title=f"PPD Sent to Management: {p.project_name}",
        message=f"PPD {ppd_id} has been submitted to the Management Committee for review.",
        action_type="ppd_submitted",
        entity_id=ppd_id,
        entity_name=p.project_name,
        created_by=current_user.get("name", ""),
    )

    await db.commit()
    return {"ok": True, "status": p.status, "notified_roles": MGMT_ROLES}


# ── STAGE 3: Management Committee per-role approval ───────────────────────────

@router.patch("/{ppd_id}/mgmt-review")
async def update_mgmt_review(
    ppd_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    rd_head / marketing_head / sales_head / gdso_head / regulatory / cfo update their own mgmt_approval entry.
    body: { status: "Approved" | "Pending", comment: "..." }

    - Only the caller's own entry is updated — no cascading.
    - Rework must go through POST /rework.
    - When ALL six entries are 'Approved': status → MgmtApproved,
      assigns ceo task, notifies CEO.
    """
    result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "PPD not found")

    role = current_user.get("role", "fd")

    if role != "admin" and role not in MGMT_ROLES:
        raise HTTPException(403, "Only Management Committee members can update this review")

    if p.status == "Approved":
        raise HTTPException(400, "This PPD is already approved — no further approval or rework is possible")
    if p.status != "MgmtReview":
        raise HTTPException(400, "Management approval is not available for this PPD at its current stage")
    if role != "admin" and any(e.get("role") == role and e.get("status") == "Approved" for e in (p.mgmt_approvals or [])):
        raise HTTPException(400, "You have already approved this PPD")

    new_status_val = (body.get("status") or "").strip()
    comment_val    = (body.get("comment") or "").strip()
    ALLOWED = {"Pending", "Approved"}

    if new_status_val not in ALLOWED:
        raise HTTPException(400, f"Use POST /rework to request rework. Allowed statuses here: {ALLOWED}")

    current_mgmt = copy.deepcopy(p.mgmt_approvals or list(DEFAULT_MGMT_APPROVALS))

    updated = False
    target_role_in_body = body.get("role")  # set only when admin approves a specific slot

    for entry in current_mgmt:
        entry_role = entry.get("role")
        # Non-admin: update own slot only
        # Admin with specific role in body: update that slot only
        # Admin with no role in body: update ALL pending slots
        if role != "admin" and entry_role == role:
            entry["status"]     = new_status_val
            entry["comment"]    = comment_val
            entry["updated_at"] = _ist_now_iso()
            updated = True
            break
        elif role == "admin" and target_role_in_body:
            if entry_role == target_role_in_body:
                entry["status"]     = new_status_val
                entry["comment"]    = comment_val
                entry["updated_at"] = _ist_now_iso()
                updated = True
                break
        elif role == "admin" and not target_role_in_body:
            # Approve all pending slots
            if entry.get("status") != "Approved":
                entry["status"]     = new_status_val
                entry["comment"]    = comment_val
                entry["updated_at"] = _ist_now_iso()
            updated = True

    if not updated and role != "admin":
        raise HTTPException(403, "Your role is not in the Management Committee reviewer list")

    p.mgmt_approvals = current_mgmt
    flag_modified(p, "mgmt_approvals")

    if new_status_val == "Approved":
        # Mark the approving role's task(s) as approved — reduces dashboard pending count
        # When admin approves all at once, close all mgmt tasks for this PPD
        if role == "admin" and not body.get("role"):
            # Admin approved all slots at once — close all mgmt tasks
            task_upd = await db.execute(
                select(Task)
                .where(Task.ppd_id == ppd_id)
                .where(Task.type == "ppd_mgmt_approval")
                .where(Task.status == "pending")
            )
        else:
            close_role = body.get("role") if (role == "admin" and body.get("role")) else role
            task_upd = await db.execute(
                select(Task)
                .where(Task.ppd_id == ppd_id)
                .where(Task.assigned_role == close_role)
                .where(Task.type == "ppd_mgmt_approval")
                .where(Task.status == "pending")
            )
        for t in task_upd.scalars().all():
            t.status = "approved"

        all_mgmt_approved = all(e.get("status") == "Approved" for e in current_mgmt)
        if all_mgmt_approved:
            # ALL 6 mgmt approved → MgmtApproved; now assign CEO
            p.status = "MgmtApproved"

            # Expand teams_involved to include ceo
            current_teams = set((p.teams_involved or "").split(","))
            expanded = current_teams | set(FINAL_APPROVER_ROLES)
            p.teams_involved = _teams_str(expanded)

            # Initialise final_approvals
            p.final_approvals = list(DEFAULT_FINAL_APPROVALS)
            flag_modified(p, "final_approvals")

            # Create task for CEO
            for final_role in FINAL_APPROVER_ROLES:
                db.add(Task(
                    title=f"Final Approval: PPD {ppd_id} — {p.project_name}",
                    project_name=p.project_name,
                    ppd_id=ppd_id,
                    assigned_role=final_role,
                    type="ppd_final_approval",
                    status="pending",
                    priority="Critical",
                    due_label="Today",
                ))

            # Notify ONLY CEO
            await notify_roles(
                db,
                roles=FINAL_APPROVER_ROLES,
                title=f"PPD Requires Your Final Approval: {p.project_name}",
                message=(
                    f"All 6 Management Committee members approved PPD {ppd_id}. "
                    f"Your final CEO approval is required."
                ),
                action_type="ppd_final_review",
                entity_id=ppd_id,
                entity_name=p.project_name,
                created_by=current_user.get("name", ""),
            )

            # Notify existing involved team that it advanced
            await notify_roles(
                db,
                roles=list(TEAMS_AT_STAGE["mgmt"]),
                title=f"Management Committee Approved: {p.project_name}",
                message=(
                    f"All Management Committee members approved PPD {ppd_id}. "
                    f"CFO and CEO have been assigned for final approval."
                ),
                action_type="ppd_mgmt_approved",
                entity_id=ppd_id,
                entity_name=p.project_name,
                created_by=current_user.get("name", ""),
            )
        else:
            # Notify remaining pending mgmt reviewers
            pending = [e.get("role") for e in current_mgmt if e.get("status") != "Approved"]
            if pending:
                await notify_roles(
                    db,
                    roles=pending,
                    title=f"Management Review Reminder: {p.project_name}",
                    message=(
                        f"{current_user.get('name','User')} approved PPD {ppd_id}. "
                        f"Your management review is still pending."
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
        action_label=f"updated Stage-3 mgmt review on PPD {ppd_id} ({role}: {new_status_val})",
        entity=ppd_id,
        involved_roles=p.teams_involved or "admin",
        time_ago="just now",
    ))

    await db.commit()
    return {"ok": True, "mgmt_approvals": p.mgmt_approvals, "status": p.status}


# ── STAGE 4: CFO / CEO Final Approval ────────────────────────────────────────

@router.patch("/{ppd_id}/final-review")
async def update_final_review(
    ppd_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    CEO updates their final_approval entry.
    body: { status: "Approved" | "Pending", comment: "..." }

    - Only CEO (or admin) can call this.
    - Rework must go through POST /rework.
    - When CEO approves: status → Approved (terminal).
      teams_involved expanded to ALL_ROLES.
    """
    result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "PPD not found")

    role = current_user.get("role", "fd")

    if role != "admin" and role not in FINAL_APPROVER_ROLES:
        raise HTTPException(403, "Only CEO can give final approval")

    if p.status == "Approved":
        raise HTTPException(400, "This PPD is already approved — no further approval or rework is possible")
    if p.status not in ("FinalReview", "MgmtApproved"):
        raise HTTPException(
            400,
            f"PPD is not in Final Review stage (current: {p.status})"
        )

    # Auto-promote to FinalReview if still MgmtApproved (first time CFO/CEO acts)
    if p.status == "MgmtApproved":
        p.status = "FinalReview"

    new_status_val = (body.get("status") or "").strip()
    comment_val    = (body.get("comment") or "").strip()
    ALLOWED = {"Pending", "Approved"}

    if new_status_val not in ALLOWED:
        raise HTTPException(400, f"Use POST /rework to request rework. Allowed statuses here: {ALLOWED}")

    current_final = copy.deepcopy(p.final_approvals or list(DEFAULT_FINAL_APPROVALS))

    updated = False
    for entry in current_final:
        if entry.get("role") == role:
            entry["status"]     = new_status_val
            entry["comment"]    = comment_val
            entry["updated_at"] = _ist_now_iso()
            updated = True
            break

    if not updated and role != "admin":
        raise HTTPException(403, "Your role is not in the Final Approver list")

    p.final_approvals = current_final
    flag_modified(p, "final_approvals")

    if new_status_val == "Approved":
        # Mark the approving role's task as approved — reduces dashboard pending count
        task_upd = await db.execute(
            select(Task)
            .where(Task.ppd_id == ppd_id)
            .where(Task.assigned_role == role)
            .where(Task.type == "ppd_final_approval")
            .where(Task.status == "pending")
        )
        for t in task_upd.scalars().all():
            t.status = "approved"

        all_final_approved = all(e.get("status") == "Approved" for e in current_final)
        if all_final_approved:
            # CEO approved → fully Approved, expand visibility
            full_teams = p.full_teams_involved or ALL_ROLES
            p.status = "Approved"
            p.teams_involved = full_teams

            db.add(AuditLog(
                user_name=current_user.get("name", ""),
                user_email=current_user.get("sub", ""),
                action="APPROVE",
                action_label=f"final approval complete on PPD {ppd_id}",
                entity=ppd_id,
                involved_roles=full_teams,
                time_ago="just now",
            ))

            await notify_roles(
                db,
                roles=full_teams.split(","),
                title=f"PPD Fully Approved: {p.project_name}",
                message=(
                    f"PPD {ppd_id} ({p.project_name}) has received final approval from the CEO. "
                    f"It is now visible to all teams."
                ),
                action_type="ppd_approved",
                entity_id=ppd_id,
                entity_name=p.project_name,
                created_by=current_user.get("name", ""),
            )
        else:
            # Notify the remaining pending final approver
            pending = [e.get("role") for e in current_final if e.get("status") != "Approved"]
            if pending:
                await notify_roles(
                    db,
                    roles=pending,
                    title=f"Final Approval Reminder: {p.project_name}",
                    message=(
                        f"{current_user.get('name','User')} approved PPD {ppd_id}. "
                        f"Your final approval is still pending."
                    ),
                    action_type="ppd_review_turn",
                    entity_id=ppd_id,
                    entity_name=p.project_name,
                    created_by=current_user.get("name", ""),
                )

    if p.status != "Approved":
        db.add(AuditLog(
            user_name=current_user.get("name", ""),
            user_email=current_user.get("sub", ""),
            action="UPDATE",
            action_label=f"updated Stage-4 final review on PPD {ppd_id} ({role}: {new_status_val})",
            entity=ppd_id,
            involved_roles=p.teams_involved or "admin",
            time_ago="just now",
        ))

    await db.commit()
    return {"ok": True, "final_approvals": p.final_approvals, "status": p.status}


# ── REWORK: Any reviewer sends PPD back for corrections ───────────────────────

@router.post("/{ppd_id}/rework")
async def request_rework(
    ppd_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Any reviewer at any stage sends PPD back for rework.
    body: { comment: "..." }

    - Stores rework_from_stage so rework-done knows where to restore.
    - Notification goes ONLY to source team + task owners.
    - No other stage is notified.
    """
    result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "PPD not found")

    role = current_user.get("role", "fd")
    if role not in ALL_REVIEWER_ROLES:
        raise HTTPException(403, "Only reviewers can request rework")

    rework_comment = (body.get("comment") or "").strip()
    rework_text = _plain(rework_comment)
    if not rework_text:
        raise HTTPException(400, "A rework comment explaining what needs to be fixed is required")
    _check_comment_len(rework_comment)
    files = [a for a in (body.get("attachments") or []) if isinstance(a, dict) and a.get("url")]

    if p.status == "Approved":
        raise HTTPException(400, "This PPD is already approved — no further approval or rework is possible")
    if p.status not in ("Pending", "ReviewerApproved", "MgmtReview", "MgmtApproved", "FinalReview", "Rework"):
        raise HTTPException(400, "Rework is not available for this PPD at its current stage")

    # Determine which stage we're coming from
    stage_map = {
        "Pending":      "initial",
        "ReviewerApproved": "initial",
        "MgmtReview":   "mgmt",
        "MgmtApproved": "mgmt",
        "FinalReview":  "final",
    }
    # Already in Rework (another reviewer adds a rework) → keep the original stage
    from_stage = (p.rework_from_stage or "initial") if p.status == "Rework" else stage_map.get(p.status, "initial")
    own = {"initial": p.reviewers, "mgmt": p.mgmt_approvals, "final": p.final_approvals}.get(from_stage) or []
    if role != "admin" and any(e.get("role") == role and e.get("status") == "Approved" for e in own):
        raise HTTPException(400, "You have already approved this PPD at this stage")
    p.rework_from_stage = from_stage
    p.status = "Rework"

    # Close all pending tasks for this PPD at this stage (rework supersedes them)
    stage_type_map = {
        "initial": "ppd_review",
        "mgmt":    "ppd_mgmt_approval",
        "final":   "ppd_final_approval",
    }
    close_type = stage_type_map.get(from_stage, "ppd_review")
    rw_task_upd = await db.execute(
        select(Task)
        .where(Task.ppd_id == ppd_id)
        .where(Task.type == close_type)
        .where(Task.status == "pending")
    )
    for t in rw_task_upd.scalars().all():
        t.status = "rework"

    # Update the relevant reviewer list entry
    if from_stage == "initial":
        current_list = copy.deepcopy(p.reviewers or [])
        list_name = "reviewers"
    elif from_stage == "mgmt":
        current_list = copy.deepcopy(p.mgmt_approvals or [])
        list_name = "mgmt_approvals"
    else:  # final
        current_list = copy.deepcopy(p.final_approvals or [])
        list_name = "final_approvals"

    idx = next((i for i, r in enumerate(current_list) if r.get("role") == role), None)
    if idx is not None:
        current_list[idx]["status"]     = "Rework"
        current_list[idx]["comment"]    = rework_text[:1000]
        current_list[idx]["updated_at"] = _ist_now_iso()
        setattr(p, list_name, current_list)
        flag_modified(p, list_name)

    # Rework comment — visible to everyone involved in this PPD (rich text + attachments kept)
    comment_obj = PPDComment(
        ppd_id=ppd_id,
        user_name=current_user.get("name", ""),
        user_role=role,
        comment=rework_comment,
        action_tag="rework",
        attachment_url=files[0]["url"][:500] if files else None,
        attachment_name=(files[0].get("filename") or "")[:255] if files else None,
        attachments=files or None,
        user_email=current_user.get("sub", ""),
        rework_resolved=False,
        visible_to_roles=None,
    )
    db.add(comment_obj)

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="REWORK",
        action_label=f"requested rework on PPD {ppd_id} (from {from_stage} stage): {rework_text[:80]}",
        entity=ppd_id,
        involved_roles="source,admin",
        time_ago="just now",
    ))

    # Route back to the Source Team: keep them involved + give them a rework task (one open task per PPD)
    teams = set(_involved_roles(p))
    if "source" not in teams:
        p.teams_involved = _teams_str(teams | {"source"})
    open_rw = (await db.execute(
        select(Task).where(Task.ppd_id == ppd_id).where(Task.type == "ppd_rework").where(Task.status == "pending")
    )).scalars().first()
    if not open_rw:
        db.add(Task(
            title=f"Rework PPD {ppd_id} — {p.project_name}"[:255],
            project_name=p.project_name,
            ppd_id=ppd_id,
            assigned_role="source",
            type="ppd_rework",
            status="pending",
            priority="High",
            due_label="Today",
        ))

    # Notify ONLY source team
    await notify_roles(
        db,
        roles=["source"],
        title=f"Rework Required: {p.project_name}",
        message=(
            f"{current_user.get('name','User')} ({role.upper()}) sent PPD {ppd_id} for rework. "
            f"Reason: {rework_text}"
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
        "rework_from_stage": from_stage,
        "comment_id": comment_obj.id,
    }


# ── REWORK DONE: Source Team resubmits after fixing ───────────────────────────

@router.post("/{ppd_id}/rework-done")
async def confirm_rework_done(
    ppd_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Source Team (or task owner) confirms rework is done and resubmits.
    body: { reply_comment: "Changes completed: ..." }

    - Restores status to the appropriate stage (Pending / MgmtReview / FinalReview)
    - Resets the Rework entry for the reviewer who sent rework back to Pending
    - Notifies the original reviewer(s) who sent the rework
    """
    result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "PPD not found")

    if p.status != "Rework":
        raise HTTPException(400, f"PPD is not in Rework status (current: {p.status})")

    role = current_user.get("role", "fd")
    if role not in (p.teams_involved or "").split(",") and role != "admin":
        raise HTTPException(403, "You are not assigned to this PPD")

    reply_comment = (body.get("reply_comment") or "").strip()
    if not reply_comment:
        raise HTTPException(400, "A reply comment confirming the changes is required")
    _check_comment_len(reply_comment)

    from_stage = p.rework_from_stage or "initial"
    restore_status = REWORK_RESTORE_STATUS.get(from_stage, "Pending")

    # Determine the reviewer list for this stage
    if from_stage == "initial":
        current_list = copy.deepcopy(p.reviewers or [])
        list_name = "reviewers"
    elif from_stage == "mgmt":
        current_list = copy.deepcopy(p.mgmt_approvals or [])
        list_name = "mgmt_approvals"
    else:
        current_list = copy.deepcopy(p.final_approvals or [])
        list_name = "final_approvals"

    # Find who sent the rework
    rework_roles = [e.get("role") for e in current_list if e.get("status") == "Rework"]
    if not rework_roles:
        # Fallback: notify all reviewers at this stage
        if from_stage == "initial":
            rework_roles = list(INITIAL_REVIEWER_ROLES)
        elif from_stage == "mgmt":
            rework_roles = list(MGMT_ROLES)
        else:
            rework_roles = list(FINAL_APPROVER_ROLES)

    # Reset "Rework" entries back to "Pending"
    for entry in current_list:
        if entry.get("status") == "Rework":
            entry["status"]     = "Pending"
            entry["updated_at"] = _ist_now_iso()
    setattr(p, list_name, current_list)
    flag_modified(p, list_name)

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

    # Store reply comment visible to reviewer + task owner
    reply_obj = PPDComment(
        ppd_id=ppd_id,
        user_name=current_user.get("name", ""),
        user_role=role,
        comment=reply_comment,
        action_tag="rework_done",
        rework_resolved=True,
        user_email=current_user.get("sub", ""),
        visible_to_roles=None,
    )
    db.add(reply_obj)

    # Close the Source Team rework task
    for t in (await db.execute(
        select(Task).where(Task.ppd_id == ppd_id).where(Task.type == "ppd_rework").where(Task.status == "pending")
    )).scalars().all():
        t.status = "completed"

    # Restore status
    p.status = restore_status
    p.rework_from_stage = None

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="REWORK_DONE",
        action_label=f"confirmed rework done on PPD {ppd_id}, restored to {restore_status}",
        entity=ppd_id,
        involved_roles=",".join(rework_roles + [role]),
        time_ago="just now",
    ))

    await notify_roles(
        db,
        roles=rework_roles,
        title=f"Rework Completed: {p.project_name}",
        message=(
            f"{current_user.get('name','User')} completed the rework on PPD {ppd_id}. "
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
        "restored_to_stage": from_stage,
        "notified_reviewers": rework_roles,
    }


# ── COMMENTS ──────────────────────────────────────────────────────────────────

@router.get("/{ppd_id}/comments")
async def list_comments(
    ppd_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """All comments (incl. rework) are visible to everyone assigned / involved in the PPD."""
    p = (await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))).scalars().first()
    if not p:
        raise HTTPException(404, "PPD not found")
    if not _can_access(p, current_user):
        raise HTTPException(403, "You are not assigned to this PPD")
    result = await db.execute(
        select(PPDComment).where(PPDComment.ppd_id == ppd_id).order_by(PPDComment.created_at.asc(), PPDComment.id.asc())
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
    if not _can_access(p, current_user):
        raise HTTPException(403, "You are not assigned to this PPD")
    if not (body.comment or "").strip() and not body.attachments and not body.attachment_url:
        raise HTTPException(400, "Comment cannot be empty")
    _check_comment_len(body.comment)

    ALLOWED_TAGS = {"comment", "rework_done", "rework_reply"}
    action_tag = body.action_tag if body.action_tag in ALLOWED_TAGS else "comment"

    comment = PPDComment(
        ppd_id=ppd_id,
        user_name=current_user.get("name", ""),
        user_role=role,
        comment=body.comment,
        action_tag=action_tag,
        attachment_url=(body.attachment_url or "")[:500] or None,
        attachment_name=(body.attachment_name or "")[:255] or None,
        attachments=body.attachments or None,
        user_email=current_user.get("sub", ""),
        rework_resolved=False,
        visible_to_roles=None,
    )
    db.add(comment)

    if _is_assigned(p, current_user):
        for t in (await db.execute(
            select(Task).where(Task.ppd_id == ppd_id).where(Task.type == "ppd_team_review")
            .where(Task.assigned_to_email == (current_user.get("sub") or "").lower()).where(Task.status == "pending")
        )).scalars().all():
            t.status = "completed"

    await notify_roles(
        db,
        roles=_involved_roles(p),
        title=f"New Comment on PPD: {p.project_name}",
        message=f"{current_user.get('name','User')} ({role}) commented on {ppd_id}."
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
    result = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    if not result.scalars().first():
        raise HTTPException(404, "PPD not found")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type '{ext}' not allowed.")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(400, "File exceeds 10 MB limit")

    save_dir = os.path.join(UPLOAD_DIR, ppd_id)
    os.makedirs(save_dir, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(save_dir, unique_name)

    async with aiofiles.open(save_path, "wb") as f:
        await f.write(contents)

    return {"ok": True, "url": f"/uploads/ppd/{ppd_id}/{unique_name}", "filename": file.filename, "size": len(contents)}


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

    # Delete all tasks linked to this PPD so dashboard counts reset correctly
    task_rows = await db.execute(select(Task).where(Task.ppd_id == ppd_id))
    for t in task_rows.scalars().all():
        await db.delete(t)

    # Delete all notifications referencing this PPD so they don't show as stale
    await db.execute(sa_delete(Notification).where(Notification.entity_id == ppd_id))
    # Delete its comments too — PPD IDs are reused, so leftovers would appear on the next new PPD
    await db.execute(sa_delete(PPDComment).where(PPDComment.ppd_id == ppd_id))

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
    if role not in ("admin",):
        email = (current_user.get("sub") or "").lower()
        stmt = stmt.where(Task.assigned_role == role).where(
            Task.assigned_to_email.is_(None) | (Task.assigned_to_email == email))
    stmt = stmt.order_by(Task.id.desc()).limit(50)
    result = await db.execute(stmt)
    return [
        {
            "id":            t.id,
            "title":         t.title,
            "project_name":  t.project_name,
            "project_id":    t.project_id,
            "ppd_id":        t.ppd_id,
            "task_id":       t.id,
            "task_type":     t.type,
            "assigned_role": t.assigned_role,
            "type":          t.type,
            "status":        t.status,
            "priority":      t.priority,
            "due_label":     t.due_label,
        }
        for t in result.scalars().all()
    ]


@router.patch("/tasks/{task_id}/status")
async def update_task_status(
    task_id: int,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update status of a task. Allowed: pending, rework, approved."""
    new_status = (body.get("status") or "").strip()
    ALLOWED = {"pending", "rework", "approved"}
    if not new_status:
        raise HTTPException(400, "status is required")
    if new_status not in ALLOWED:
        raise HTTPException(400, f"Invalid status '{new_status}'")

    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(404, "Task not found")

    role = current_user.get("role", "fd")
    if role != "admin" and task.assigned_role != role:
        raise HTTPException(403, "You are not assigned to this task")

    task.status = new_status
    await db.commit()
    return {"ok": True}
