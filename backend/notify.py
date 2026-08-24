"""
Notification helper — used by all routers to fire role-targeted notifications.
Writes one Notification row per target role.
Special role "all" fans out to every known role key.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from orm_models import Notification
from typing import List

_ALL_ROLES = [
    "admin", "source", "pm", "fd", "rd_head", "marketing",
    "regulatory", "packaging", "adl", "pmsa", "sa", "mgmt", "ceo", "production",
]


async def notify_roles(
    db: AsyncSession,
    *,
    roles: List[str],
    title: str,
    message: str,
    action_type: str = "info",
    entity_id: str | None = None,
    entity_name: str | None = None,
    created_by: str = "",
) -> None:
    """
    Create a Notification record for each unique role in `roles`.
    Pass roles=["all"] to fan out to every known role.
    Deduplicated — each role key gets at most one row per call.
    """
    expanded: set[str] = set()
    for r in roles:
        r = r.strip()
        if not r:
            continue
        if r == "all":
            expanded.update(_ALL_ROLES)
        else:
            expanded.add(r)

    for role_key in expanded:
        db.add(
            Notification(
                target_role=role_key,
                title=title,
                message=message,
                action_type=action_type,
                entity_id=entity_id,
                entity_name=entity_name,
                created_by=created_by,
                is_read=False,
            )
        )
