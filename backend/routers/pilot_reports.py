"""
Pilot Reports router.

Upload roles : production, packaging, regulatory, sa, admin
Review role  : rd_head (approve / reject each report)
Closure flow :
  rd_head → POST /submit-for-closure  (notifies pm)
  pm      → POST /ppd/{ppd_id}/close  (marks PPD as Completed — only if status == Approved)
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db, fmt_ist, now_ist_naive
from auth import get_current_user
from orm_models import PilotReport, PPDSubmission, AuditLog
from notify import notify_roles
from pydantic import BaseModel
from typing import Optional
import os, uuid, aiofiles
from datetime import datetime, timezone

router = APIRouter(prefix="/api/pilot-reports", tags=["pilot-reports"])

UPLOAD_ROLES  = {"admin", "production", "packaging", "regulatory", "sa"}
REVIEW_ROLE   = {"admin", "rd_head"}
CLOSURE_ROLE  = {"admin", "rd_head"}
PM_ROLE       = {"admin", "pm"}

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "pilot_reports")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALL_ROLES = "admin,source,pm,fd,rd_head,marketing_head,sales_head,gdso_head,regulatory,cfo,packaging,adl,pmsa,sa,ceo,production"


def _out(r: PilotReport) -> dict:
    return {
        "id":             r.id,
        "report_id":      r.report_id,
        "ppd_id":         r.ppd_id,
        "project_name":   r.project_name,
        "report_type":    r.report_type,
        "file_name":      r.file_name,
        "file_url":       r.file_url,
        "notes":          r.notes,
        "status":         r.status,
        "review_comment": r.review_comment,
        "reviewed_by":    r.reviewed_by,
        "reviewed_at":    fmt_ist(r.reviewed_at),
        "created_by":     r.created_by,
        "created_by_role":r.created_by_role,
        "created_at":     fmt_ist(r.created_at),
    }


# ── LIST ──────────────────────────────────────────────────────────────────────

@router.get("")
async def list_reports(
    ppd_id: str = Query(""),
    status: str = Query("all"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PilotReport)
    if ppd_id:
        stmt = stmt.where(PilotReport.ppd_id == ppd_id)
    if status != "all":
        stmt = stmt.where(PilotReport.status == status)
    stmt = stmt.order_by(PilotReport.created_at.desc()).limit(200)
    result = await db.execute(stmt)
    return [_out(r) for r in result.scalars().all()]


# ── UPLOAD ────────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def upload_report(
    ppd_id:      str        = Form(...),
    report_type: str        = Form("General"),
    notes:       str        = Form(""),
    file:        UploadFile = File(...),
    current_user: dict      = Depends(get_current_user),
    db: AsyncSession        = Depends(get_db),
):
    role = current_user.get("role", "")
    if role not in UPLOAD_ROLES:
        raise HTTPException(403, "Only production, packaging, regulatory, or scientific affairs can upload reports")

    ppd_res = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    ppd = ppd_res.scalars().first()
    if not ppd:
        raise HTTPException(404, f"PPD {ppd_id} not found")

    # Save file
    ext = os.path.splitext(file.filename or "report")[-1] or ".pdf"
    safe_name = f"{uuid.uuid4().hex}{ext}"
    file_path  = os.path.join(UPLOAD_DIR, safe_name)
    async with aiofiles.open(file_path, "wb") as f_out:
        content = await file.read()
        await f_out.write(content)
    file_url = f"/uploads/pilot_reports/{safe_name}"

    # Generate report ID
    seq = ((await db.execute(select(func.count()).select_from(PilotReport).where(PilotReport.ppd_id == ppd_id))).scalar() or 0) + 1
    report_id = f"PR-{ppd_id}-{str(seq).zfill(2)}"
    while (await db.execute(select(PilotReport.id).where(PilotReport.report_id == report_id))).scalar():
        seq += 1
        report_id = f"PR-{ppd_id}-{str(seq).zfill(2)}"

    report = PilotReport(
        report_id=report_id,
        ppd_id=ppd_id,
        project_name=ppd.project_name,
        report_type=report_type,
        file_name=file.filename,
        file_url=file_url,
        notes=notes or None,
        status="Pending",
        created_by=current_user.get("name", ""),
        created_by_role=role,
    )
    db.add(report)
    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="UPLOAD",
        action_label=f"uploaded pilot report {report_id} for {ppd.project_name}",
        entity=report_id,
        involved_roles="rd_head",
        time_ago="just now",
    ))
    await notify_roles(
        db, roles=["rd_head"],
        title=f"Pilot Report Submitted: {ppd.project_name}",
        message=f"{current_user.get('name','User')} ({role}) submitted report '{report_type}' for {ppd.project_name} ({ppd_id}). Please review.",
        action_type="info",
        entity_id=ppd_id,
        entity_name=ppd.project_name,
        created_by=current_user.get("name", ""),
    )
    await db.commit()
    await db.refresh(report)
    return _out(report)


# ── REVIEW (rd_head) ──────────────────────────────────────────────────────────

class ReviewBody(BaseModel):
    decision: str          # "approved" | "rejected"
    comment:  Optional[str] = None


@router.post("/{report_id}/review", status_code=200)
async def review_report(
    report_id: str,
    body: ReviewBody,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession   = Depends(get_db),
):
    role = current_user.get("role", "")
    if role not in REVIEW_ROLE:
        raise HTTPException(403, "Only rd_head or admin can review reports")
    if body.decision not in ("approved", "rejected"):
        raise HTTPException(400, "decision must be 'approved' or 'rejected'")

    res = await db.execute(select(PilotReport).where(PilotReport.report_id == report_id))
    rpt = res.scalars().first()
    if not rpt:
        raise HTTPException(404, "Report not found")

    rpt.status         = body.decision
    rpt.review_comment = body.comment or ""
    rpt.reviewed_by    = current_user.get("name", "")
    rpt.reviewed_at    = now_ist_naive()

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="REVIEW",
        action_label=f"{body.decision} pilot report {report_id}",
        entity=report_id,
        involved_roles=rpt.created_by_role or "production",
        time_ago="just now",
    ))
    await notify_roles(
        db, roles=[rpt.created_by_role or "production"],
        title=f"Report {body.decision.title()}: {rpt.report_type}",
        message=f"R&D Head {body.decision} your report '{rpt.report_type}' for {rpt.project_name}."
                + (f" Comment: {body.comment}" if body.comment else ""),
        action_type="info",
        entity_id=rpt.ppd_id,
        entity_name=rpt.project_name,
        created_by=current_user.get("name", ""),
    )
    await db.commit()
    return {"ok": True, "report_id": report_id, "status": rpt.status}


# ── SUBMIT FOR PROJECT CLOSURE (rd_head → notifies pm) ───────────────────────

@router.post("/submit-for-closure", status_code=200)
async def submit_for_closure(
    ppd_id: str = Form(...),
    notes:  str = Form(""),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession   = Depends(get_db),
):
    role = current_user.get("role", "")
    if role not in CLOSURE_ROLE:
        raise HTTPException(403, "Only rd_head or admin can submit for project closure")

    ppd_res = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    ppd = ppd_res.scalars().first()
    if not ppd:
        raise HTTPException(404, f"PPD {ppd_id} not found")

    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="CLOSURE_REQUEST",
        action_label=f"submitted PPD {ppd_id} for project closure",
        entity=ppd_id,
        involved_roles="pm",
        time_ago="just now",
    ))
    await notify_roles(
        db, roles=["pm"],
        title=f"Project Closure Request: {ppd.project_name}",
        message=f"R&D Head {current_user.get('name','User')} has submitted {ppd_id} ({ppd.project_name}) for project closure. "
                + (f"Notes: {notes}. " if notes else "")
                + "Please review and close the project when ready.",
        action_type="info",
        entity_id=ppd_id,
        entity_name=ppd.project_name,
        created_by=current_user.get("name", ""),
    )
    await db.commit()
    return {"ok": True, "ppd_id": ppd_id}


# ── CLOSE PROJECT (pm — only when PPD status == Approved) ────────────────────

@router.post("/close-project", status_code=200)
async def close_project(
    ppd_id: str = Form(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession   = Depends(get_db),
):
    role = current_user.get("role", "")
    if role not in PM_ROLE:
        raise HTTPException(403, "Only pm or admin can close a project")

    ppd_res = await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))
    ppd = ppd_res.scalars().first()
    if not ppd:
        raise HTTPException(404, f"PPD {ppd_id} not found")
    if ppd.status not in ("Approved", "Completed"):
        raise HTTPException(400, f"PPD must be Approved before it can be closed (current: {ppd.status})")

    ppd.status = "Completed"
    db.add(AuditLog(
        user_name=current_user.get("name", ""),
        user_email=current_user.get("sub", ""),
        action="CLOSE",
        action_label=f"closed project PPD {ppd_id} — {ppd.project_name}",
        entity=ppd_id,
        involved_roles=ppd.teams_involved or ALL_ROLES,
        time_ago="just now",
    ))
    await notify_roles(
        db, roles=(ppd.teams_involved or ALL_ROLES).split(","),
        title=f"Project Closed: {ppd.project_name}",
        message=f"Project Manager {current_user.get('name','User')} has officially closed project {ppd_id} ({ppd.project_name}).",
        action_type="info",
        entity_id=ppd_id,
        entity_name=ppd.project_name,
        created_by=current_user.get("name", ""),
    )
    await db.commit()
    return {"ok": True, "ppd_id": ppd_id, "status": "Completed"}
