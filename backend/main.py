"""
FastAPI main application — Zydus Wellness (MySQL edition)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import create_tables
from config import get_settings
from routers import auth, dashboard, projects, users, audit
from routers.notifications import router as notifications_router

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()   # CREATE TABLE IF NOT EXISTS on startup
    yield

app = FastAPI(
    title="Zydus Wellness — Product Development Platform API",
    description="Role-aware FastAPI + MySQL backend for Zydus Wellness FMCG.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000", "http://localhost:3001"],
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

@app.get("/")
async def root():
    return {"service": "Zydus Wellness Platform API", "version": "1.0.0", "db": "MySQL 8.0"}

@app.get("/health")
async def health():
    return {"status": "ok", "service": "zydus-wellness-api"}
