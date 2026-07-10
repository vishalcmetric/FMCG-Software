"""
Seed script — populates MySQL with demo data so the dashboard is live immediately.
Run once:  python seed.py
Requires MySQL to be running and the DB/user configured in .env (or defaults).
"""
import asyncio
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from config import get_settings
from orm_models import Base, Project, Task, AuditLog, User

settings  = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Demo data ─────────────────────────────────────────────────────────────────

NOW = datetime.now(timezone.utc).replace(tzinfo=None)

PROJECTS = [
    dict(project_id="ZW-2026-001", name="Complan Pro Chocolate Boost",        brand="Complan",    type="New Product",        status="PPD Review",        progress=25,  priority="High",     owner="Rahul Mehta",   owner_email="source@zyduswellness.com",     teams_involved="admin,source,pm,fd,rd_head,marketing,regulatory,packaging", objective="Develop a chocolate-flavored premium nutrition powder with 34 essential nutrients.", created_at=NOW-timedelta(days=5), updated_at=NOW-timedelta(hours=2)),
    dict(project_id="ZW-2026-002", name="Sugar Free Green Stevia+",            brand="Sugar Free", type="Product Improvement",status="Formulation",       progress=55,  priority="Medium",   owner="Priya Sharma",  owner_email="fd@zyduswellness.com",         teams_involved="admin,fd,rd_head,marketing,packaging",                      created_at=NOW-timedelta(days=5), updated_at=NOW-timedelta(hours=2)),
    dict(project_id="ZW-2026-003", name="Nycil Cool Menthol XT",               brand="Nycil",      type="Innovation",         status="Plant Trial",       progress=78,  priority="High",     owner="Anil Kumar",    owner_email="production@zyduswellness.com", teams_involved="admin,production,rd_head,packaging,fd",                     created_at=NOW-timedelta(days=5), updated_at=NOW-timedelta(hours=2)),
    dict(project_id="ZW-2026-004", name="Glucon-D Immunity+ Orange",           brand="Glucon-D",   type="AVD",                status="Regulatory Review", progress=62,  priority="Medium",   owner="Sneha Patel",   owner_email="regulatory@zyduswellness.com", teams_involved="admin,regulatory,rd_head,fd",                               created_at=NOW-timedelta(days=5), updated_at=NOW-timedelta(hours=2)),
    dict(project_id="ZW-2026-005", name="Everyuth Naturals Aloe Face Wash",    brand="Everyuth",   type="Cost Reduction",     status="CEO Approval",      progress=92,  priority="Critical", owner="Vikram Singh",  owner_email="source@zyduswellness.com",     teams_involved="admin,ceo,mgmt,marketing,packaging",                       created_at=NOW-timedelta(days=5), updated_at=NOW-timedelta(hours=2)),
    dict(project_id="ZW-2026-006", name="Complan NutriGro Strawberry",         brand="Complan",    type="New Product",        status="Draft",             progress=10,  priority="Low",      owner="Rahul Mehta",   owner_email="source@zyduswellness.com",     teams_involved="admin,source,marketing",                                   created_at=NOW-timedelta(days=5), updated_at=NOW-timedelta(hours=2)),
    dict(project_id="ZW-2025-098", name="Nutralite Choco Spread Lite",         brand="Nutralite",  type="Sustainability",     status="Completed",         progress=100, priority="Medium",   owner="Meera Iyer",    owner_email="rd_head@zyduswellness.com",    teams_involved="admin",                                                    created_at=NOW-timedelta(days=5), updated_at=NOW-timedelta(hours=2)),
]

TASKS = [
    dict(title="Review PPD v2.1",              project_name="Complan Pro Chocolate",  project_id="ZW-2026-001", assigned_role="source",     type="approval",    status="pending", priority="High",     due_date=NOW,                       due_label="Today"),
    dict(title="Approve Formulation",           project_name="Sugar Free Green Stevia+",project_id="ZW-2026-002",assigned_role="rd_head",    type="approval",    status="pending", priority="Medium",   due_date=NOW+timedelta(days=1),     due_label="Tomorrow"),
    dict(title="Sensory Evaluation Report",     project_name="Everyuth Aloe Face Wash",project_id="ZW-2026-005", assigned_role="pmsa",       type="report",      status="pending", priority="Critical", due_date=NOW,                       due_label="Today"),
    dict(title="Regulatory Assessment",         project_name="Glucon-D Immunity+",     project_id="ZW-2026-004", assigned_role="regulatory", type="review",      status="pending", priority="Medium",   due_date=NOW+timedelta(days=2),     due_label="2 days"),
    dict(title="Update formula F-04 protein %", project_name="Complan Pro Chocolate",  project_id="ZW-2026-001", assigned_role="fd",         type="formulation", status="pending", priority="High",     due_date=NOW,                       due_label="Today"),
    dict(title="Lab trial report submission",   project_name="Sugar Free Stevia+",     project_id="ZW-2026-002", assigned_role="fd",         type="report",      status="pending", priority="Medium",   due_date=NOW+timedelta(days=1),     due_label="Tomorrow"),
    dict(title="Ingredient compliance check",   project_name="Complan NutriGro",       project_id="ZW-2026-006", assigned_role="regulatory", type="review",      status="pending", priority="High",     due_date=NOW,                       due_label="Today"),
    dict(title="Pilot batch report upload",     project_name="Nycil Cool Menthol XT",  project_id="ZW-2026-003", assigned_role="production", type="report",      status="pending", priority="High",     due_date=NOW,                       due_label="Today"),
]

AUDIT_LOGS = [
    dict(user_name="Priya S.",      user_email="fd@zyduswellness.com",         action="SUBMIT",   action_label="submitted FD for approval",  entity="Sugar Free Stevia+",   involved_roles="admin,rd_head,fd",        ip="10.0.35.22 / WKS-RD-025",  time_ago="5m",  timestamp=NOW-timedelta(minutes=5)),
    dict(user_name="CEO Office",    user_email="ceo@zyduswellness.com",        action="APPROVE",  action_label="approved final PPD",          entity="Everyuth Aloe",        involved_roles="admin,ceo",               ip="10.0.10.1 / WKS-CEO-001",   time_ago="25m", timestamp=NOW-timedelta(minutes=25)),
    dict(user_name="Rahul M.",      user_email="source@zyduswellness.com",     action="CREATE",   action_label="created new project",         entity="Complan NutriGro",     involved_roles="admin,source",            ip="10.0.24.15 / WKS-MKT-042",  time_ago="1h",  timestamp=NOW-timedelta(hours=1)),
    dict(user_name="Regulatory",    user_email="regulatory@zyduswellness.com", action="REWORK",   action_label="requested rework",            entity="Nycil XT",             involved_roles="admin,regulatory,rd_head",ip="10.0.42.22 / WKS-REG-005",  time_ago="2h",  timestamp=NOW-timedelta(hours=2)),
    dict(user_name="Plant Team",    user_email="production@zyduswellness.com", action="UPLOAD",   action_label="uploaded stability report",   entity="Glucon-D",             involved_roles="admin,production,rd_head",ip="10.0.55.10 / WKS-PLT-003",  time_ago="3h",  timestamp=NOW-timedelta(hours=3)),
    dict(user_name="Dr. Anjali Rao",user_email="rd_head@zyduswellness.com",    action="APPROVE",  action_label="approved Formula F-04",       entity="Formula F-04",         involved_roles="admin,rd_head,fd",        ip="10.0.35.11 / WKS-RD-018",   time_ago="20m", timestamp=NOW-timedelta(minutes=20)),
    dict(user_name="Amit Verma",    user_email="regulatory@zyduswellness.com", action="CREATE",   action_label="created Regulatory Assessment",entity="Regulatory Assessment",involved_roles="admin,regulatory",        ip="10.0.42.22 / WKS-REG-005",  time_ago="18m", timestamp=NOW-timedelta(minutes=18)),
    dict(user_name="System",        user_email="system",                       action="SAP_SYNC", action_label="synced 245 records from SAP", entity="245 records synced",   involved_roles="admin",                   ip="System",                    time_ago="15m", timestamp=NOW-timedelta(minutes=15)),
]

USERS = [
    dict(name="Admin User",    email="admin@zyduswellness.com",      role="admin",      department="IT",          status="Active"),
    dict(name="Rahul Mehta",   email="source@zyduswellness.com",     role="source",     department="Marketing",   status="Active"),
    dict(name="Priti Nair",    email="pm@zyduswellness.com",         role="pm",         department="PMO",         status="Active"),
    dict(name="Priya Sharma",  email="fd@zyduswellness.com",         role="fd",         department="R&D",         status="Active"),
    dict(name="Dr. Anjali Rao",email="rd_head@zyduswellness.com",    role="rd_head",    department="R&D",         status="Active"),
    dict(name="Neeraj Kapoor", email="marketing@zyduswellness.com",  role="marketing",  department="Marketing",   status="Active"),
    dict(name="Amit Verma",    email="regulatory@zyduswellness.com", role="regulatory", department="Regulatory",  status="Active"),
    dict(name="Rajesh Nair",   email="packaging@zyduswellness.com",  role="packaging",  department="Packaging",   status="Inactive"),
    dict(name="Anil Kumar",    email="production@zyduswellness.com", role="production", department="Production",  status="Active"),
    dict(name="CEO Office",    email="ceo@zyduswellness.com",        role="ceo",        department="Leadership",  status="Active"),
    dict(name="Management MC", email="mgmt@zyduswellness.com",       role="mgmt",       department="Leadership",  status="Active"),
    dict(name="Demo User",     email="demo.user@zyduswellness.com",  role="admin",      department="IT",          status="Active"),
]

# ── seed function ─────────────────────────────────────────────────────────────

async def seed():
    engine = create_async_engine(settings.async_db_url, echo=False)

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)   # fresh start
        await conn.run_sync(Base.metadata.create_all)
    print("  Tables created")

    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with SessionLocal() as db:
        # Projects
        for p in PROJECTS:
            db.add(Project(**p))
        await db.flush()
        print(f"  Inserted {len(PROJECTS)} projects")

        # Tasks
        for t in TASKS:
            db.add(Task(**t))
        await db.flush()
        print(f"  Inserted {len(TASKS)} tasks")

        # Audit logs
        for a in AUDIT_LOGS:
            db.add(AuditLog(**a))
        await db.flush()
        print(f"  Inserted {len(AUDIT_LOGS)} audit logs")

        # Users (with hashed passwords)
        for u in USERS:
            db.add(User(
                **u,
                password_hash=pwd_context.hash("Welcome@123"),
                created_at=NOW,
            ))
        await db.flush()
        print(f"  Inserted {len(USERS)} users")

        await db.commit()

    await engine.dispose()
    print("\nSeed complete! All demo data loaded into MySQL.")

if __name__ == "__main__":
    asyncio.run(seed())
