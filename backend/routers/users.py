"""
Users router — admin-only user management.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth import require_admin, hash_password
from models import UserCreate, UserUpdate
from orm_models import User
from datetime import datetime, timezone

router = APIRouter(prefix="/api/users", tags=["users"])


def _user_out(u: User) -> dict:
    return {
        "id":          u.id,
        "name":        u.name,
        "email":       u.email,
        "role":        u.role,
        "department":  u.department,
        "status":      u.status,
        "last_login":  u.last_login.isoformat() if u.last_login else None,
        "created_at":  u.created_at.isoformat() if u.created_at else None,
    }


@router.get("")
async def list_users(
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).order_by(User.name))
    return [_user_out(u) for u in result.scalars().all()]


@router.post("", status_code=201)
async def create_user(
    body: UserCreate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.email == body.email.lower()))
    if existing.scalars().first():
        raise HTTPException(400, "Email already registered")

    user = User(
        name=body.name,
        email=body.email.lower(),
        role=body.role,
        department=body.department,
        password_hash=hash_password(body.password),
        status="Active",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _user_out(user)


@router.put("/{user_id}")
async def update_user(
    user_id: int,
    body: UserUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalars().first()
    if not u:
        raise HTTPException(404, "User not found")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    for field, value in updates.items():
        setattr(u, field, value)

    await db.commit()
    return {"ok": True}


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalars().first()
    if not u:
        raise HTTPException(404, "User not found")
    await db.delete(u)
    await db.commit()
    return {"ok": True}
