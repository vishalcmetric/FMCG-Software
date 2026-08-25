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


async def _migrate_columns() -> None:
    """Add any new columns that don't yet exist in already-deployed tables."""
    migrations = [
        # (table, column, column_definition)
        ("ppd_submissions", "mgmt_approvals", "JSON NULL"),
        ("ppd_submissions", "ppd_title", "VARCHAR(255) NULL"),
        ("lab_experiments", "formula_id", "VARCHAR(30) NULL"),
        ("lab_experiments", "version",    "VARCHAR(10) NULL"),
    ]
    try:
        conn = await aiomysql.connect(
            host=settings.mysql_host,
            port=settings.mysql_port,
            user=settings.mysql_user,
            password=settings.mysql_password,
            db=settings.mysql_db,
        )
        async with conn.cursor() as cur:
            for table, column, col_def in migrations:
                # Check if column exists
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
        conn.close()
    except Exception as e:
        print(f"Warning: column migration skipped or failed ({e})")
