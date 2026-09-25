"""
Module documents: Costing & Packaging Feasibility / Regulatory pages.
User selects a PPD and uploads documents; documents are listed per PPD.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db, fmt_ist
from auth import get_current_user
from orm_models import ModuleDocument, PPDSubmission, AuditLog
from routers.ppd import ALLOWED_EXTENSIONS, MAX_FILE_SIZE
from typing import List
import os, uuid, aiofiles

router = APIRouter(prefix="/api/module-docs", tags=["module-docs"])

UPLOAD_ROLES = {
    "costing":    {"admin", "packaging", "rd_head", "mgmt"},
    "regulatory": {"admin", "regulatory", "rd_head"},
    "claim":      {"admin", "sa", "rd_head", "regulatory"},
}
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "module_docs")


def _out(d: ModuleDocument) -> dict:
    return {
        "id": d.id, "module": d.module, "ppd_id": d.ppd_id, "project_name": d.project_name,
        "file_name": d.file_name, "file_url": d.file_url, "file_size": d.file_size or 0,
        "uploaded_by": d.uploaded_by, "uploaded_by_role": d.uploaded_by_role,
        "created_at": fmt_ist(d.created_at),
    }


def _check_module(module: str):
    if module not in UPLOAD_ROLES:
        raise HTTPException(400, "Invalid module")


@router.get("")
async def list_docs(
    module: str = Query(...),
    ppd_id: str = Query(""),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_module(module)
    stmt = select(ModuleDocument).where(ModuleDocument.module == module)
    if ppd_id:
        stmt = stmt.where(ModuleDocument.ppd_id == ppd_id)
    res = await db.execute(stmt.order_by(ModuleDocument.created_at.desc(), ModuleDocument.id.desc()))
    return [_out(d) for d in res.scalars().all()]


@router.post("", status_code=201)
async def upload_docs(
    module: str = Form(...),
    ppd_id: str = Form(...),
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_module(module)
    role = current_user.get("role", "")
    if role not in UPLOAD_ROLES[module]:
        raise HTTPException(403, "You are not allowed to upload documents here")
    ppd = (await db.execute(select(PPDSubmission).where(PPDSubmission.ppd_id == ppd_id))).scalars().first()
    if not ppd:
        raise HTTPException(404, f"PPD {ppd_id} not found")
    if not files:
        raise HTTPException(400, "Select at least one file")

    # Validate everything before saving anything
    items = []
    for f in files:
        ext = os.path.splitext(f.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(400, f"File type '{ext or '?'}' not allowed ({f.filename})")
        data = await f.read()
        if len(data) > MAX_FILE_SIZE:
            raise HTTPException(400, f"{f.filename} exceeds 10 MB limit")
        items.append((f.filename, ext, data))

    save_dir = os.path.join(UPLOAD_DIR, module, ppd_id)
    os.makedirs(save_dir, exist_ok=True)
    docs = []
    for name, ext, data in items:
        unique = f"{uuid.uuid4().hex}{ext}"
        async with aiofiles.open(os.path.join(save_dir, unique), "wb") as out:
            await out.write(data)
        d = ModuleDocument(
            module=module, ppd_id=ppd_id, project_name=ppd.project_name,
            file_name=(name or "document")[:255], file_url=f"/uploads/module_docs/{module}/{ppd_id}/{unique}",
            file_size=len(data), uploaded_by=current_user.get("name", "")[:150], uploaded_by_role=role,
        )
        db.add(d)
        docs.append(d)
    db.add(AuditLog(
        user_name=current_user.get("name", ""), user_email=current_user.get("sub", ""),
        action="UPLOAD", action_label=f"uploaded {len(docs)} {module} document(s) for {ppd.project_name}",
        entity=ppd_id, involved_roles=",".join(sorted(UPLOAD_ROLES[module])), time_ago="just now",
    ))
    await db.commit()
    for d in docs:
        await db.refresh(d)
    return [_out(d) for d in docs]


@router.delete("/{doc_id}")
async def delete_doc(
    doc_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    d = (await db.execute(select(ModuleDocument).where(ModuleDocument.id == doc_id))).scalars().first()
    if not d:
        raise HTTPException(404, "Document not found")
    if current_user.get("role") != "admin" and current_user.get("name", "") != d.uploaded_by:
        raise HTTPException(403, "Only the uploader or admin can delete this document")
    path = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", (d.file_url or "").lstrip("/")))
    if os.path.isfile(path):
        try:
            os.remove(path)
        except Exception:
            pass
    await db.delete(d)
    await db.commit()
    return {"ok": True}
