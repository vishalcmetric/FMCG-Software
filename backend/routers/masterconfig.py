"""
Master Configuration router — brands, project types, raw materials, departments.
Admin only for mutations; all roles can read.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth import get_current_user, require_admin
from orm_models import MasterConfig
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/master-config", tags=["master-config"])

VALID_TYPES = {"brand", "project_type", "raw_material", "department"}

DEFAULT_SEEDS = [
    # Brands
    {"config_type": "brand", "key": "complan", "label": "Complan", "meta": {}, "sort_order": 1},
    {"config_type": "brand", "key": "sugar_free", "label": "Sugar Free", "meta": {}, "sort_order": 2},
    {"config_type": "brand", "key": "nycil", "label": "Nycil", "meta": {}, "sort_order": 3},
    {"config_type": "brand", "key": "glucon_d", "label": "Glucon-D", "meta": {}, "sort_order": 4},
    {"config_type": "brand", "key": "everyuth", "label": "Everyuth", "meta": {}, "sort_order": 5},
    {"config_type": "brand", "key": "nutralite", "label": "Nutralite", "meta": {}, "sort_order": 6},
    # Project Types
    {"config_type": "project_type", "key": "new_product", "label": "New Product", "meta": {}, "sort_order": 1},
    {"config_type": "project_type", "key": "avd", "label": "AVD", "meta": {}, "sort_order": 2},
    {"config_type": "project_type", "key": "innovation", "label": "Innovation", "meta": {}, "sort_order": 3},
    {"config_type": "project_type", "key": "sustainability", "label": "Sustainability", "meta": {}, "sort_order": 4},
    {"config_type": "project_type", "key": "cost_reduction", "label": "Cost Reduction", "meta": {}, "sort_order": 5},
    {"config_type": "project_type", "key": "product_improvement", "label": "Product Improvement", "meta": {}, "sort_order": 6},
    # Raw Materials
    {"config_type": "raw_material", "key": "RM-001", "label": "Whey Protein Isolate", "meta": {"category": "Protein", "vendor": "Glanbia"}, "sort_order": 1},
    {"config_type": "raw_material", "key": "RM-002", "label": "Cocoa Powder", "meta": {"category": "Flavoring", "vendor": "Cargill"}, "sort_order": 2},
    {"config_type": "raw_material", "key": "RM-003", "label": "Sucralose", "meta": {"category": "Sweetener", "vendor": "JK Sucralose"}, "sort_order": 3},
    # Departments
    {"config_type": "department", "key": "rd", "label": "R&D", "meta": {}, "sort_order": 1},
    {"config_type": "department", "key": "marketing", "label": "Marketing", "meta": {}, "sort_order": 2},
    {"config_type": "department", "key": "regulatory", "label": "Regulatory", "meta": {}, "sort_order": 3},
    {"config_type": "department", "key": "packaging", "label": "Packaging", "meta": {}, "sort_order": 4},
    {"config_type": "department", "key": "production", "label": "Production", "meta": {}, "sort_order": 5},
]


class ConfigCreate(BaseModel):
    config_type: str
    key: str
    label: str
    meta: Optional[dict] = None
    sort_order: Optional[int] = 0


class ConfigUpdate(BaseModel):
    label: Optional[str] = None
    meta: Optional[dict] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


def _out(c: MasterConfig) -> dict:
    return {
        "id": c.id, "config_type": c.config_type, "key": c.key,
        "label": c.label, "meta": c.meta or {}, "is_active": c.is_active,
        "sort_order": c.sort_order,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


@router.get("")
async def list_config(
    config_type: str = Query("", description="Filter by type: brand|project_type|raw_material|department"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Seed defaults on first call if table is empty."""
    total = (await db.execute(select(MasterConfig))).scalars().first()
    if not total:
        for seed in DEFAULT_SEEDS:
            db.add(MasterConfig(**seed))
        await db.commit()

    stmt = select(MasterConfig).where(MasterConfig.is_active == True)
    if config_type:
        stmt = stmt.where(MasterConfig.config_type == config_type)
    stmt = stmt.order_by(MasterConfig.config_type, MasterConfig.sort_order)
    result = await db.execute(stmt)
    return [_out(c) for c in result.scalars().all()]


@router.post("", status_code=201)
async def create_config(body: ConfigCreate, current_user: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    if body.config_type not in VALID_TYPES:
        raise HTTPException(400, f"config_type must be one of {VALID_TYPES}")
    existing = await db.execute(select(MasterConfig).where(MasterConfig.config_type == body.config_type, MasterConfig.key == body.key))
    if existing.scalars().first():
        raise HTTPException(400, "Key already exists for this config type")
    c = MasterConfig(config_type=body.config_type, key=body.key, label=body.label,
                     meta=body.meta or {}, sort_order=body.sort_order or 0)
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return _out(c)


@router.put("/{config_id}")
async def update_config(config_id: int, body: ConfigUpdate, current_user: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MasterConfig).where(MasterConfig.id == config_id))
    c = result.scalars().first()
    if not c:
        raise HTTPException(404, "Config not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(c, field, value)
    await db.commit()
    return {"ok": True}


@router.delete("/{config_id}")
async def delete_config(config_id: int, current_user: dict = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MasterConfig).where(MasterConfig.id == config_id))
    c = result.scalars().first()
    if not c:
        raise HTTPException(404, "Config not found")
    c.is_active = False  # soft-delete
    await db.commit()
    return {"ok": True}
