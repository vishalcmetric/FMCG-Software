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
    task_id: Optional[int] = None        # DB task.id — used to mark complete
    task_type: Optional[str] = None      # e.g. "formulation" "regulatory" "report"
    status: Optional[str] = "pending"   # current task status (pending/in_progress/approved/etc.)

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
    recent_ppds: List[dict] = []

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
    project_name: str
    brand: str
    ppd_title: Optional[str] = None        # short title to distinguish multiple PPDs
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
    action_tag: str = "comment"       # "comment" | "approve" | "rework_done" | "rework_reply"
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None

class PPDReworkRequest(BaseModel):
    comment: str                      # required — what needs to be fixed
    notify_roles: Optional[List[str]] = None  # optional targeted role list

class PPDReworkDoneRequest(BaseModel):
    reply_comment: str                # required — confirmation of what was done

# ── Formulation ───────────────────────────────────────────────────────────────
class FormulaCreate(BaseModel):
    ppd_id: str
    project_name: Optional[str] = None
    trial_no: Optional[str] = None
    batch_no: Optional[str] = None
    batch_size: Optional[str] = None
    unit_qty: Optional[str] = None
    mfg_date: Optional[str] = None
    trial_taken_by: Optional[str] = None
    evaluated_by: Optional[str] = None
    method_of_preparation: Optional[str] = None
    observation: Optional[str] = None
    conclusion: Optional[str] = None
    ingredients: Optional[List[dict]] = None

class FormulaUpdate(BaseModel):
    status: Optional[str] = None
    trial_no: Optional[str] = None
    batch_no: Optional[str] = None
    batch_size: Optional[str] = None
    unit_qty: Optional[str] = None
    mfg_date: Optional[str] = None
    trial_taken_by: Optional[str] = None
    evaluated_by: Optional[str] = None
    method_of_preparation: Optional[str] = None
    observation: Optional[str] = None
    conclusion: Optional[str] = None
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
