"""
SQLAlchemy async engine + session factory for MySQL.
Auto-creates the database if it does not exist.
"""
import aiomysql
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config import get_settings
from datetime import datetime
try:
    import zoneinfo
    IST = zoneinfo.ZoneInfo("Asia/Kolkata")
except ImportError:
    from datetime import timezone, timedelta
    IST = timezone(timedelta(hours=5, minutes=30))  # IST = UTC+5:30 fallback

def now_ist() -> datetime:
    """Return the current time as a timezone-aware IST datetime."""
    return datetime.now(IST)

def now_ist_naive() -> datetime:
    """Return the current time in IST as a *naive* datetime (for MySQL storage)."""
    return datetime.now(IST).replace(tzinfo=None)

def fmt_ist(dt) -> str | None:
    """
    Serialise a datetime for API responses.
    MySQL stores naive datetimes; after setting the connection timezone to +05:30
    those values are in IST.  We append '+05:30' so the browser parses them
    correctly instead of treating them as local (UTC) time.
    Returns None when dt is None.
    """
    if dt is None:
        return None
    return dt.strftime("%Y-%m-%dT%H:%M:%S+05:30")

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


ALL_ROLES = "admin,source,pm,fd,rd_head,marketing_head,sales_head,gdso_head,regulatory,cfo,marketing,packaging,adl,pmsa,sa,ceo,production"


async def _migrate_columns() -> None:
    """Add any new columns to already-deployed tables."""
    column_migrations = [
        # (table, column, column_definition)
        ("ppd_submissions",  "mgmt_approvals",   "JSON NULL"),
        ("ppd_submissions",  "ppd_title",         "VARCHAR(255) NULL"),
        ("lab_experiments",  "formula_id",        "VARCHAR(30) NULL"),
        ("lab_experiments",  "version",           "VARCHAR(10) NULL"),
        ("lab_experiments",  "ppd_id",            "VARCHAR(50) NULL"),
        ("formulas",         "ppd_id",            "VARCHAR(50) NULL"),
        ("plant_trials",     "ppd_id",            "VARCHAR(50) NULL"),
        ("regulatory_checks","ppd_id",            "VARCHAR(50) NULL"),
        ("sensory_evaluations","ppd_id",          "VARCHAR(50) NULL"),
        ("costing_records",  "ppd_id",            "VARCHAR(50) NULL"),
        ("claim_records",    "ppd_id",            "VARCHAR(50) NULL"),
        ("artwork_briefs",   "ppd_id",            "VARCHAR(50) NULL"),
        ("artwork_briefs",   "assigned_to",        "VARCHAR(150) NULL"),
        ("artwork_briefs",   "comment",            "TEXT NULL"),
        ("artwork_briefs",   "version",            "VARCHAR(10) NULL DEFAULT 'v1.0'"),
        ("tasks",            "ppd_id",            "VARCHAR(50) NULL"),
        ("ppd_comments",     "attachment_url",    "VARCHAR(500) NULL"),
        ("ppd_comments",     "attachment_name",   "VARCHAR(255) NULL"),
        # New columns for rework workflow
        ("ppd_comments",     "rework_resolved",   "TINYINT(1) NOT NULL DEFAULT 0"),
        ("ppd_comments",     "visible_to_roles",  "VARCHAR(500) NULL"),
        # Post-approval full visibility list
        ("ppd_submissions",  "full_teams_involved", "VARCHAR(500) NULL"),
        # Multi-stage approval columns
        ("ppd_submissions",  "final_approvals",         "JSON NULL"),
        ("ppd_submissions",  "rework_from_stage",        "VARCHAR(30) NULL"),
        # New formula fields
        ("formulas",         "trial_no",                "VARCHAR(50) NULL"),
        ("formulas",         "batch_no",                "VARCHAR(50) NULL"),
        ("formulas",         "batch_size",              "VARCHAR(50) NULL"),
        ("formulas",         "unit_qty",                "VARCHAR(50) NULL"),
        ("formulas",         "mfg_date",                "VARCHAR(30) NULL"),
        ("formulas",         "trial_taken_by",          "VARCHAR(255) NULL"),
        ("formulas",         "evaluated_by",            "VARCHAR(255) NULL"),
        ("formulas",         "method_of_preparation",   "TEXT NULL"),
        ("formulas",         "observation",             "TEXT NULL"),
        ("formulas",         "conclusion",              "TEXT NULL"),
        # Formula approval workflow columns
        ("formulas",         "approval_status",         "VARCHAR(20) NULL"),
        ("formulas",         "approval_comment",        "TEXT NULL"),
        ("formulas",         "approved_by",             "VARCHAR(150) NULL"),
        ("formulas",         "approved_at",             "DATETIME NULL"),
    ]

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

        # Make project_id nullable on ppd_submissions, formulas, and artwork_briefs — these columns
        # exist in the DB from before the project module was removed, but ORM no longer sets them.
        for _tbl in ("ppd_submissions", "formulas", "artwork_briefs", "lab_experiments", "plant_trials", "regulatory_checks", "sensory_evaluations", "costing_records", "claim_records"):
            try:
                await cur.execute(
                    "SELECT IS_NULLABLE FROM information_schema.COLUMNS "
                    "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = 'project_id'",
                    (settings.mysql_db, _tbl),
                )
                row = await cur.fetchone()
                if row and row[0] == 'NO':
                    await cur.execute(
                        f"ALTER TABLE `{_tbl}` MODIFY COLUMN `project_id` VARCHAR(20) NULL DEFAULT NULL"
                    )
                    await conn.commit()
                    print(f"Migration: made {_tbl}.project_id nullable")
            except Exception as e:
                print(f"Warning: {_tbl} project_id nullable migration failed ({e})")

        # Backfill PPD submissions with empty reviewers if NULL
        _default_reviewers = (
            '[{"role":"fd","team_label":"R&D / F&D Team","head_name":"",'
            '"status":"Pending","comment":"","updated_at":""},'
            '{"role":"pm","team_label":"Project Management","head_name":"",'
            '"status":"Pending","comment":"","updated_at":""}]'
        )
        try:
            await cur.execute(
                "UPDATE `ppd_submissions` SET `reviewers` = %s "
                "WHERE `reviewers` IS NULL OR JSON_LENGTH(`reviewers`) = 0",
                (_default_reviewers,),
            )
            await conn.commit()
        except Exception as e:
            print(f"Warning: ppd_submissions reviewers backfill failed ({e})")

        # Backfill full_teams_involved for existing rows that don't have it set yet
        _all_roles = "admin,source,pm,fd,rd_head,marketing_head,sales_head,gdso_head,regulatory,cfo,marketing,packaging,adl,pmsa,sa,ceo,production"
        try:
            await cur.execute(
                "UPDATE `ppd_submissions` SET `full_teams_involved` = %s "
                "WHERE `full_teams_involved` IS NULL OR `full_teams_involved` = ''",
                (_all_roles,),
            )
            await conn.commit()
        except Exception as e:
            print(f"Warning: ppd_submissions full_teams_involved backfill failed ({e})")

        # For already-Approved PPDs: ensure teams_involved is the full list
        try:
            await cur.execute(
                "UPDATE `ppd_submissions` SET `teams_involved` = `full_teams_involved` "
                "WHERE `status` = 'Approved' AND (`full_teams_involved` IS NOT NULL AND `full_teams_involved` != '')"
            )
            await conn.commit()
        except Exception as e:
            print(f"Warning: ppd_submissions approved teams_involved backfill failed ({e})")

    conn.close()
