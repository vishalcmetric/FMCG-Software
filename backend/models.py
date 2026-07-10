"""
Pydantic schemas — request/response shapes.
Kept separate from ORM models.
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# ── Auth ──────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# ── Dashboard ─────────────────────────────────────────────────────────────────
class StatCard(BaseModel):
    label: str
    value: int
    change: str
    icon: str
    color: str

class PendingTask(BaseModel):
    project: str
    task: str
    priority: str
    due: str
    project_id: Optional[str] = None

class ActivityItem(BaseModel):
    user: str
    action: str
    project: str
    time: str

class PipelineStage(BaseModel):
    stage: str
    count: int
    progress: int

class DashboardResponse(BaseModel):
    stats: List[StatCard]
    pending_tasks: List[PendingTask]
    recent_activity: List[ActivityItem]
    pipeline: List[PipelineStage]
    role: str

# ── Projects ──────────────────────────────────────────────────────────────────
class ProjectCreate(BaseModel):
    name: str
    brand: str
    type: str
    priority: str = "Medium"
    objective: Optional[str] = None
    target_launch: Optional[str] = None
    teams_involved: Optional[List[str]] = None   # admin can assign teams at creation

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    objective: Optional[str] = None
    target_launch: Optional[str] = None
    teams_involved: Optional[str] = None         # comma-separated string

# ── Users ─────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    role: str
    department: str
    password: str = "Welcome@123"

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None

# ── Auth flows ────────────────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    department: str
    role: str = "fd"
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str
