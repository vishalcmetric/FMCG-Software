"""
FastAPI main application — FMCG Software Platform (MySQL edition)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from database import create_tables
from config import get_settings
import os
from routers import auth, dashboard, users, audit
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
from routers.reports_pdf import router as reports_pdf_router
from routers.pilot_reports import router as pilot_reports_router

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await create_tables()   # CREATE TABLE IF NOT EXISTS on startup
        print("Database tables ready.")
    except Exception as e:
        print(f"Startup table creation warning: {e}")
    yield

app = FastAPI(
    title="FMCG Software — Product Development Platform API",
    description="Role-aware FastAPI + MySQL backend for FMCG Software Platform.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_methods=["*"],
    allow_origins=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Serve uploaded files as static assets
_uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(_uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_uploads_dir), name="uploads")

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(users.router)
app.include_router(audit.router)
app.include_router(notifications_router)
app.include_router(ppd_router)
app.include_router(reports_pdf_router)   # before formulation_router — /report/{id} must not match /{formula_id}
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
app.include_router(pilot_reports_router)

@app.get("/")
async def root():
    return {"service": "FMCG Software Platform API", "version": "1.0.0", "db": "MySQL 8.0"}

@app.get("/health")
async def health():
    return {"status": "ok", "service": "fmcg-software-api"}


@app.post("/api/seed")
async def run_seed():
    """Populate the database with demo data."""
    try:
        import seed as _seed_mod
        await _seed_mod.seed()
        return {"ok": True, "message": "Demo data seeded successfully"}
    except Exception as e:
        import traceback
        return {"ok": False, "error": str(e), "traceback": traceback.format_exc()}


@app.post("/api/clear-data")
async def clear_all_data():
    """
    Delete ALL application data (seed + test data).
    Keeps table structure intact. Admin use only.
    """
    from database import AsyncSessionLocal
    from sqlalchemy import text
    tables = [
        "audit_logs", "notifications", "tasks", "ppd_comments",
        "ppd_submissions", "formula_comments", "formulas",
        "lab_experiments", "plant_trials", "regulatory_checks",
        "sensory_evaluations", "costing_records", "claim_records",
        "artwork_briefs", "master_config", "users",
    ]
    async with AsyncSessionLocal() as db:
        for tbl in tables:
            try:
                await db.execute(text(f"DELETE FROM `{tbl}`"))
            except Exception:
                pass
        await db.commit()
    return {"ok": True, "message": "All data cleared. Tables are empty."}
