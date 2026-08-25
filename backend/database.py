"""
SQLAlchemy async engine + session factory for MySQL.
Auto-creates the database if it does not exist.
"""
import aiomysql
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config import get_settings

settings = get_settings()


async def _ensure_database() -> None:
    """Connect without specifying a DB and run CREATE DATABASE IF NOT EXISTS."""
    try:
        conn = await aiomysql.connect(
            host=settings.mysql_host,
            port=settings.mysql_port,
            user=settings.mysql_user,
            password=settings.mysql_password,
        )
        async with conn.cursor() as cur:
            await cur.execute(
                f"CREATE DATABASE IF NOT EXISTS `{settings.mysql_db}` "
                f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        conn.close()
    except Exception as e:
        print(f"Warning: _ensure_database skipped or failed ({e})")


engine = create_async_engine(
    settings.async_db_url,
    pool_size=10,
    max_overflow=20,
    pool_recycle=300,
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def create_tables():
    """Ensure DB exists, then create all tables if they don't exist."""
    await _ensure_database()
    from orm_models import Base as OrmBase  # import here to avoid circular
    async with engine.begin() as conn:
        await conn.run_sync(OrmBase.metadata.create_all)
    # Run incremental column migrations for columns added after initial deploy
    await _migrate_columns()


ALL_ROLES = "admin,source,pm,fd,rd_head,marketing,regulatory,packaging,adl,pmsa,sa,mgmt,ceo,production"


async def _migrate_columns() -> None:
    """Add any new columns and run one-time data fixes on already-deployed tables."""
    column_migrations = [
        # (table, column, column_definition)
        ("ppd_submissions", "mgmt_approvals", "JSON NULL"),
        ("ppd_submissions", "ppd_title",      "VARCHAR(255) NULL"),
        ("lab_experiments", "formula_id",     "VARCHAR(30) NULL"),
        ("lab_experiments", "version",        "VARCHAR(10) NULL"),
    ]

    # Open connection once; each fix runs in its own try/except so one failure
    # does not silently abort the remaining migrations.
    try:
        conn = await aiomysql.connect(
            host=settings.mysql_host,
            port=settings.mysql_port,
            user=settings.mysql_user,
            password=settings.mysql_password,
            db=settings.mysql_db,
        )
    except Exception as e:
        print(f"Warning: _migrate_columns could not connect to DB ({e})")
        return

    async with conn.cursor() as cur:

        # ── 1. Column additions ────────────────────────────────────────────
        for table, column, col_def in column_migrations:
            try:
                await cur.execute(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS "
                    "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s",
                    (settings.mysql_db, table, column),
                )
                (exists,) = await cur.fetchone()
                if not exists:
                    await cur.execute(
                        f"ALTER TABLE `{table}` ADD COLUMN `{column}` {col_def}"
                    )
                    await conn.commit()
                    print(f"Migration: added column {table}.{column}")
            except Exception as e:
                print(f"Warning: column migration {table}.{column} failed ({e})")

        # ── 2. Fix projects with narrow teams_involved ─────────────────────
        # Root cause: the ORM column used to default to "admin" so old rows only
        # had "admin" or "admin,source".  We detect those by checking for absence
        # of "fd" (a role that must always be present in the full list).
        try:
            await cur.execute(
                "UPDATE `projects` SET `teams_involved` = %s "
                "WHERE `teams_involved` NOT LIKE %s",
                (ALL_ROLES, "%fd%"),
            )
            fixed = cur.rowcount
            await conn.commit()
            if fixed:
                print(f"Migration: fixed teams_involved on {fixed} project(s) → ALL_ROLES")
        except Exception as e:
            print(f"Warning: projects teams_involved backfill failed ({e})")

        # ── 3. Fix PPD submissions with narrow teams_involved ──────────────
        try:
            await cur.execute(
                "UPDATE `ppd_submissions` SET `teams_involved` = %s "
                "WHERE `teams_involved` NOT LIKE %s",
                (ALL_ROLES, "%fd%"),
            )
            fixed_ppd = cur.rowcount
            await conn.commit()
            if fixed_ppd:
                print(f"Migration: fixed teams_involved on {fixed_ppd} ppd_submission(s) → ALL_ROLES")
        except Exception as e:
            print(f"Warning: ppd_submissions teams_involved backfill failed ({e})")

        # ── 4. Backfill PPD submissions with empty reviewers ──────────────
        # Old records created before DEFAULT_REVIEWERS seeding was added have
        # reviewers = NULL or [].  Seed them now so the review workflow works.
        _default_reviewers = (
            '[{"role":"fd","team_label":"R&D / F&D Team","head_name":"",'
            '"status":"Pending","comment":"","updated_at":""},'
            '{"role":"pm","team_label":"Project Management","head_name":"",'
            '"status":"Pending","comment":"","updated_at":""}]'
        )
        _default_mgmt = (
            '[{"role":"marketing_head","label":"Marketing Head","status":"Pending","comment":"","approved_at":""},'
            '{"role":"sales_head","label":"Sales Head","status":"Pending","comment":"","approved_at":""},'
            '{"role":"rd_head","label":"R&D Head","status":"Pending","comment":"","approved_at":""},'
            '{"role":"gdso_head","label":"GDSO Head","status":"Pending","comment":"","approved_at":""},'
            '{"role":"regulatory","label":"Regulatory Head","status":"Pending","comment":"","approved_at":""},'
            '{"role":"cfo","label":"CFO","status":"Pending","comment":"","approved_at":""}]'
        )
        try:
            await cur.execute(
                "UPDATE `ppd_submissions` SET `reviewers` = %s "
                "WHERE `reviewers` IS NULL OR JSON_LENGTH(`reviewers`) = 0",
                (_default_reviewers,),
            )
            fixed_rev = cur.rowcount
            await conn.commit()
            if fixed_rev:
                print(f"Migration: seeded reviewers on {fixed_rev} ppd_submission(s)")
        except Exception as e:
            print(f"Warning: ppd_submissions reviewers backfill failed ({e})")

        try:
            await cur.execute(
                "UPDATE `ppd_submissions` SET `mgmt_approvals` = %s "
                "WHERE `mgmt_approvals` IS NULL OR JSON_LENGTH(`mgmt_approvals`) = 0",
                (_default_mgmt,),
            )
            fixed_mgmt = cur.rowcount
            await conn.commit()
            if fixed_mgmt:
                print(f"Migration: seeded mgmt_approvals on {fixed_mgmt} ppd_submission(s)")
        except Exception as e:
            print(f"Warning: ppd_submissions mgmt_approvals backfill failed ({e})")

    conn.close()
