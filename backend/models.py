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

# ── PPD ───────────────────────────────────────────────────────────────────────
class PPDCreate(BaseModel):
    project_id: str
    project_name: str
    brand: str
    product_category: Optional[str] = None
    target_consumer: Optional[str] = None
    market_segment: Optional[str] = None
    expected_launch: Optional[str] = None
    objective: Optional[str] = None
    key_benefits: Optional[str] = None

class PPDUpdate(BaseModel):
    product_category: Optional[str] = None
    target_consumer: Optional[str] = None
    market_segment: Optional[str] = None
    expected_launch: Optional[str] = None
    objective: Optional[str] = None
    key_benefits: Optional[str] = None
    status: Optional[str] = None
    reviewers: Optional[List[dict]] = None

class PPDCommentCreate(BaseModel):
    comment: str
    action_tag: str = "comment"   # "comment" | "rework" | "approve"

# ── Formulation ───────────────────────────────────────────────────────────────
class IngredientItem(BaseModel):
    name: str
    qty: Optional[str] = None
    unit: Optional[str] = None
    supplier: Optional[str] = None

class FormulaCreate(BaseModel):
    project_id: str
    project_name: Optional[str] = None
    formula_type: Optional[str] = "Trial"
    protein_source: Optional[str] = None
    sweetener: Optional[str] = None
    cocoa_pct: Optional[str] = None
    protein_pct: Optional[str] = None
    sugar_per_100g: Optional[str] = None
    cost_per_kg: Optional[str] = None
    stability_40c: Optional[str] = None
    sensory_score: Optional[str] = None
    notes: Optional[str] = None
    ingredients: Optional[List[dict]] = None

class FormulaUpdate(BaseModel):
    formula_type: Optional[str] = None
    status: Optional[str] = None
    protein_source: Optional[str] = None
    sweetener: Optional[str] = None
    cocoa_pct: Optional[str] = None
    protein_pct: Optional[str] = None
    sugar_per_100g: Optional[str] = None
    cost_per_kg: Optional[str] = None
    stability_40c: Optional[str] = None
    sensory_score: Optional[str] = None
    notes: Optional[str] = None
    ingredients: Optional[List[dict]] = None

class FormulaCommentCreate(BaseModel):
    comment: str

# ── Tasks ─────────────────────────────────────────────────────────────────────
class TaskCreate(BaseModel):
    title: str
    assigned_role: str
    type: Optional[str] = "General"
    priority: str = "Medium"
    due_date: Optional[str] = None
    due_label: Optional[str] = None
