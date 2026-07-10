"""
Notification helper — called by other routers to fan-out notifications to roles.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from orm_models import Notification


async def notify_roles(
    db: AsyncSession,
    *,
    roles: list[str],          # list of role keys, or ["all"] for everyone
    title: str,
    message: str,
    action_type: str = "info",
    entity_id: str | None = None,
    entity_name: str | None = None,
    created_by: str = "Admin",
):
    """
    Create one Notification row per target role.
    Pass roles=["all"] to notify every role at once with a single row.
    """
    if not roles:
        return
    for role in roles:
        db.add(Notification(
            target_role=role,
            title=title,
            message=message,
            action_type=action_type,
            entity_id=entity_id,
            entity_name=entity_name,
            created_by=created_by,
        ))
    # caller must await db.commit() after this
