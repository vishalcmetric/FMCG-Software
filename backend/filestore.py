"""
Uploaded-file storage.

Every upload is written to backend/uploads/<path> (as before) AND stored in the
stored_files table, so /uploads/<path> keeps working after the server disk is
wiped (e.g. a Render restart / redeploy).
"""
import mimetypes
import os

import aiofiles
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from orm_models import StoredFile

UPLOADS_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "uploads"))


def _rel(url_or_path: str) -> str:
    """'/uploads/ppd/x/a.pdf' or 'ppd/x/a.pdf' → 'ppd/x/a.pdf'"""
    p = (url_or_path or "").replace("\\", "/").lstrip("/")
    return p[len("uploads/"):] if p.startswith("uploads/") else p


def disk_path(url_or_path: str) -> str | None:
    """Absolute path inside backend/uploads, or None if the path escapes it."""
    full = os.path.normpath(os.path.join(UPLOADS_ROOT, _rel(url_or_path)))
    return full if full.startswith(UPLOADS_ROOT + os.sep) else None


def content_type_for(name: str) -> str:
    return mimetypes.guess_type(name or "")[0] or "application/octet-stream"


async def save_upload(db: AsyncSession, url: str, data: bytes) -> None:
    """Write the file to disk and keep a copy in the DB (caller commits)."""
    full = disk_path(url)
    if not full:
        raise ValueError("Invalid upload path")
    os.makedirs(os.path.dirname(full), exist_ok=True)
    async with aiofiles.open(full, "wb") as out:
        await out.write(data)
    rel = _rel(url)
    try:                                              # DB copy is best-effort — never block the upload
        async with db.begin_nested():
            await db.execute(delete(StoredFile).where(StoredFile.path == rel))
            db.add(StoredFile(path=rel, content_type=content_type_for(rel), size=len(data), content=data))
    except Exception as e:
        print(f"[filestore] DB copy of {rel} not saved: {e}")


async def load_upload(db: AsyncSession, url: str) -> tuple[bytes, str] | None:
    """(bytes, content_type) from disk, else from the DB (and restore it to disk)."""
    full = disk_path(url)
    if not full:
        return None
    if os.path.isfile(full):
        async with aiofiles.open(full, "rb") as f:
            return await f.read(), content_type_for(full)
    row = (await db.execute(select(StoredFile).where(StoredFile.path == _rel(url)))).scalars().first()
    if not row:
        return None
    try:                                              # re-cache on disk for next time
        os.makedirs(os.path.dirname(full), exist_ok=True)
        async with aiofiles.open(full, "wb") as out:
            await out.write(row.content)
    except Exception:
        pass
    return row.content, row.content_type or content_type_for(full)


async def delete_upload(db: AsyncSession, url: str) -> None:
    """Remove the file from disk and the DB (caller commits)."""
    full = disk_path(url)
    if full and os.path.isfile(full):
        try:
            os.remove(full)
        except Exception:
            pass
    await db.execute(delete(StoredFile).where(StoredFile.path == _rel(url)))
