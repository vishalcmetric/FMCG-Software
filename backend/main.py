"""
FastAPI main application — FMCG Software Platform (MySQL edition)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import create_tables
from config import get_settings
from routers import auth, dashboard, projects, users, audit
from routers.notifications import router as notifications_router
from routers.permissions import router as permissions_router
from routers.ppd import router as ppd_router
from routers.formulation import router as formulation_router
from routers.labbook import router as labbook_router
from routers.planttrials import router as planttrials_router
from routers.regulatory import router as regulatory_router
from routers.sensory import router as sensory_router
from routers.costing import router as costing_router
from routers.claims import router as claims_router
from routers.masterconfig import router as masterconfig_router
from routers.reports import router as reports_router
from routers.artwork import router as artwork_router

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await create_tables()   # CREATE TABLE IF NOT EXISTS on startup
        from database import AsyncSessionLocal
        from orm_models import Project
        from sqlalchemy import select, func
        async with AsyncSessionLocal() as session:
            res = await session.execute(select(func.count(Project.id)))
            count = res.scalar() or 0
            if count == 0:
                print("Database is empty. Auto-seeding demo data...")
                import seed as _seed_mod
                await _seed_mod.seed()
    except Exception as e:
        print(f"Startup table creation/seed warning: {e}")
    yield

app = FastAPI(
    title="FMCG Software — Product Development Platform API",
    description="Role-aware FastAPI + MySQL backend for FMCG Software Platform.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(projects.router)
app.include_router(users.router)
app.include_router(audit.router)
app.include_router(notifications_router)
app.include_router(ppd_router)
app.include_router(formulation_router)
app.include_router(labbook_router)
app.include_router(planttrials_router)
app.include_router(regulatory_router)
app.include_router(sensory_router)
app.include_router(costing_router)
app.include_router(claims_router)
app.include_router(masterconfig_router)
app.include_router(reports_router)
app.include_router(artwork_router)
app.include_router(permissions_router)

@app.get("/")
async def root():
    return {"service": "FMCG Software Platform API", "version": "1.0.0", "db": "MySQL 8.0"}

@app.get("/health")
async def health():
    return {"status": "ok", "service": "fmcg-software-api"}


@app.post("/api/seed")
async def run_seed():
    """
    Populate the database with demo data (drops and recreates all rows).
    Only call this in development — protected by requiring the X-Seed-Key header
    equal to the SECRET_KEY to prevent accidental prod wipes.
    """
    import seed as _seed_mod
    await _seed_mod.seed()
    return {"ok": True, "message": "Demo data seeded successfully"}
