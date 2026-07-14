"""
SQLAlchemy async engine + session factory for MySQL.
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.async_db_url,
    pool_size=10,
    max_overflow=20,
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
    """Create all tables if they don't exist."""
    from orm_models import Base as OrmBase  # import here to avoid circular
    async with engine.begin() as conn:
        await conn.run_sync(OrmBase.metadata.create_all)
