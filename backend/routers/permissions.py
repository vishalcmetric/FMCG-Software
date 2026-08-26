"""
Role Permissions router.
GET  /api/role-permissions          → all role×module permission rows
PUT  /api/role-permissions/{role}/{module} → save one row (admin only)
POST /api/role-permissions/bulk     → save entire matrix at once (admin only)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db, fmt_ist
from auth import get_current_user, require_admin
from orm_models import RolePermission
from notify import notify_roles
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/role-permissions", tags=["role-permissions"])

# ── Default permissions for every role×module combo ──────────────────────────
MODULES = [
    "Projects", "PPD", "Formulation", "Lab Notebook", "Plant Trials",
    "Regulatory", "Sensory", "Costing", "Claim", "Artwork",
    "Master Data", "Reports", "Archive", "Users", "Audit",
]

ACTIONS = ["view", "create", "edit", "submit", "approve", "delete"]

# Default permission matrix — defines what each role gets on first load
# Format: role → { module → [allowed actions] }
_DEFAULT: dict[str, dict[str, list[str]]] = {
    "admin":      {m: ACTIONS for m in MODULES},
    "source":     {
        "Projects": ["view", "create", "edit"],
        # WBS: Source team creates PPD draft, saves, submits for PM review, re-submits after rework
        "PPD":      ["view", "create", "edit", "submit"],
        "Reports":  ["view"],
        "Archive":  ["view"],
    },
    "pm":         {
        "Projects":     ["view", "create", "edit"],
        # WBS: PM reviews draft, assigns teams (sets Under Review), tracks lifecycle
        "PPD":          ["view", "edit", "submit", "approve"],
        "Master Data":  ["view", "create", "edit"],
        "Reports":      ["view"],
        "Archive":      ["view"],
    },
    "fd":         {
        "Projects":     ["view"],
        "PPD":          ["view"],
        "Formulation":  ["view", "create", "edit", "submit"],
        "Lab Notebook": ["view", "create", "edit", "submit"],
        "Sensory":      ["view", "create", "edit"],
        "Reports":      ["view"],
        "Archive":      ["view"],
    },
    "rd_head":    {
        "Projects":     ["view"],
        "PPD":          ["view", "approve"],
        "Formulation":  ["view", "edit", "approve"],
        "Lab Notebook": ["view", "approve"],
        "Plant Trials": ["view", "approve"],
        "Regulatory":   ["view"],
        "Sensory":      ["view", "approve"],
        "Costing":      ["view"],
        "Claim":        ["view", "approve"],
        "Reports":      ["view"],
        "Archive":      ["view"],
    },
    "marketing":  {
        "Projects":  ["view"],
        "PPD":       ["view", "edit", "submit", "approve"],
        "Artwork":   ["view", "create", "edit", "submit", "approve"],
        "Reports":   ["view"],
        "Archive":   ["view"],
    },
    "regulatory": {
        "Projects":    ["view"],
        "PPD":         ["view", "approve"],
        "Regulatory":  ["view", "create", "edit", "submit", "approve"],
        "Claim":       ["view", "approve"],
        "Reports":     ["view"],
        "Archive":     ["view"],
    },
    "packaging":  {
        "Projects":     ["view"],
        "PPD":          ["view"],
        "Plant Trials": ["view"],
        "Costing":      ["view", "create", "edit", "submit"],
        "Artwork":      ["view", "create", "edit", "submit"],
        "Master Data":  ["view"],
        "Reports":      ["view"],
        "Archive":      ["view"],
    },
    "adl":        {
        "Projects":     ["view"],
        "Lab Notebook": ["view", "create", "edit", "submit"],
        "Sensory":      ["view", "create", "edit"],
        "Reports":      ["view"],
        "Archive":      ["view"],
    },
    "pmsa":       {
        "Projects":  ["view"],
        "Sensory":   ["view", "create", "edit", "submit"],
        "Reports":   ["view"],
        "Archive":   ["view"],
    },
    "sa":         {
        "Projects":  ["view"],
        "Claim":     ["view", "create", "edit", "submit", "approve"],
        "Reports":   ["view"],
        "Archive":   ["view"],
    },
    # Stage-3 Management Committee — individual roles
    "marketing_head": {
        "Projects": ["view"],
        "PPD":      ["view", "approve"],
        "Reports":  ["view"],
        "Archive":  ["view"],
    },
    "sales_head": {
        "Projects": ["view"],
        "PPD":      ["view", "approve"],
        "Reports":  ["view"],
        "Archive":  ["view"],
    },
    "gdso_head":  {
        "Projects": ["view"],
        "PPD":      ["view", "approve"],
        "Reports":  ["view"],
        "Archive":  ["view"],
    },
    "cfo":        {
        "Projects": ["view"],
        "PPD":      ["view", "approve"],
        "Costing":  ["view"],
        "Reports":  ["view"],
        "Archive":  ["view"],
        "Audit":    ["view"],
    },
    # Keep mgmt for legacy/backwards compat
    "mgmt":       {
        "Projects":     ["view"],
        "PPD":          ["view", "approve"],
        "Reports":      ["view"],
        "Costing":      ["view"],
        "Archive":      ["view"],
        "Audit":        ["view"],
    },
    "ceo":        {
        "Projects":     ["view"],
        # WBS: CEO gives final approval after all 6 mgmt committee members approve
        "PPD":          ["view", "approve"],
        "Reports":      ["view"],
        "Archive":      ["view"],
        "Audit":        ["view"],
    },
    "production": {
        "Projects":     ["view"],
        "Plant Trials": ["view", "create", "edit", "submit"],
        "Master Data":  ["view"],
        "Reports":      ["view"],
        "Archive":      ["view"],
    },
}


def _make_perm_dict(role: str, module: str) -> dict:
    """Return a {action: bool} dict for a role×module using defaults."""
    allowed = _DEFAULT.get(role, {}).get(module, [])
    return {a: (a in allowed) for a in ACTIONS}


def _row_out(r: RolePermission) -> dict:
    return {
        "id":          r.id,
        "role":        r.role,
        "module":      r.module,
        "permissions": r.permissions or {},
        "updated_at":  fmt_ist(r.updated_at),
    }


async def _ensure_defaults(db: AsyncSession):
    """Seed the default permission matrix. Also adds any new roles that are missing."""
    count_result = await db.execute(select(RolePermission))
    existing_rows = count_result.scalars().all()

    if not existing_rows:
        # First time — seed everything
        for role, modules in _DEFAULT.items():
            for module in MODULES:
                perm = _make_perm_dict(role, module)
                db.add(RolePermission(role=role, module=module, permissions=perm))
        await db.commit()
        return

    # Table already has data — only seed roles that are completely missing
    existing_roles = {r.role for r in existing_rows}
    new_roles = [r for r in _DEFAULT if r not in existing_roles]
    if new_roles:
        for role in new_roles:
            for module in MODULES:
                perm = _make_perm_dict(role, module)
                db.add(RolePermission(role=role, module=module, permissions=perm))
        await db.commit()


# ── GET /my — current user's permissions as flat dict ────────────────────────
@router.get("/my")
async def get_my_permissions(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns { module: {view,create,edit,submit,approve,delete} } for the caller's role.
    Used by the frontend to gate sidebar items and action buttons.
    """
    await _ensure_defaults(db)
    role = current_user.get("role", "fd")
    result = await db.execute(
        select(RolePermission).where(RolePermission.role == role)
    )
    rows = result.scalars().all()
    out = {}
    for r in rows:
        out[r.module] = r.permissions or {}
    # Fill any missing modules with all-false
    for m in MODULES:
        if m not in out:
            out[m] = {a: False for a in ACTIONS}
    return {"role": role, "permissions": out}


# ── GET all permissions ───────────────────────────────────────────────────────
@router.get("")
async def get_all_permissions(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_defaults(db)
    result = await db.execute(
        select(RolePermission).order_by(RolePermission.role, RolePermission.module)
    )
    rows = result.scalars().all()
    return [_row_out(r) for r in rows]


# ── PUT single role×module ────────────────────────────────────────────────────
@router.put("/{role}/{module}")
async def update_permission(
    role: str,
    module: str,
    body: dict,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """body = { "view": bool, "create": bool, … }"""
    result = await db.execute(
        select(RolePermission).where(
            RolePermission.role == role,
            RolePermission.module == module,
        )
    )
    row = result.scalars().first()

    perm_data = {a: bool(body.get(a, False)) for a in ACTIONS}

    if row:
        row.permissions = perm_data
    else:
        row = RolePermission(role=role, module=module, permissions=perm_data)
        db.add(row)

    await db.commit()
    if row.id:
        await db.refresh(row)
    return {"ok": True, "role": role, "module": module, "permissions": perm_data}


# ── POST bulk save entire matrix ──────────────────────────────────────────────
class BulkPermRow(BaseModel):
    role: str
    module: str
    permissions: dict


@router.post("/bulk")
async def bulk_save_permissions(
    body: list[BulkPermRow],
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Save the entire permission matrix in one request. Notifies each affected role."""
    changed_roles: set[str] = set()

    for item in body:
        result = await db.execute(
            select(RolePermission).where(
                RolePermission.role == item.role,
                RolePermission.module == item.module,
            )
        )
        row = result.scalars().first()
        perm_data = {a: bool(item.permissions.get(a, False)) for a in ACTIONS}

        if row:
            # Only mark changed if something actually changed
            if row.permissions != perm_data:
                row.permissions = perm_data
                changed_roles.add(item.role)
        else:
            db.add(RolePermission(role=item.role, module=item.module, permissions=perm_data))
            changed_roles.add(item.role)

    # Notify each role whose permissions changed
    admin_name = current_user.get("name", "Admin")
    for role in changed_roles:
        await notify_roles(
            db, roles=[role],
            title="Your permissions have been updated",
            message=f"{admin_name} updated your module access permissions. Please refresh the page to see your updated access.",
            action_type="info",
            created_by=admin_name,
        )

    await db.commit()
    return {"ok": True, "saved": len(body), "roles_notified": list(changed_roles)}
