"""
SQLAlchemy ORM table definitions — MySQL.
All tables use Integer primary keys with auto-increment.
"""
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean,
    JSON, ForeignKey, Index, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

# ── Enums ─────────────────────────────────────────────────────────────────────
class ProjectStatus(str, enum.Enum):
    Draft           = "Draft"
    PPD_Review      = "PPD Review"
    Formulation     = "Formulation"
    Plant_Trial     = "Plant Trial"
    Regulatory_Review = "Regulatory Review"
    CEO_Approval    = "CEO Approval"
    Completed       = "Completed"
    Archived        = "Archived"
    Rework          = "Rework"

class TaskStatus(str, enum.Enum):
    pending   = "pending"
    completed = "completed"
    cancelled = "cancelled"

class UserStatus(str, enum.Enum):
    Active   = "Active"
    Inactive = "Inactive"

# ── Projects ──────────────────────────────────────────────────────────────────
class Project(Base):
    __tablename__ = "projects"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    project_id  = Column(String(20), unique=True, nullable=False, index=True)
    name        = Column(String(255), nullable=False)
    brand       = Column(String(100))
    type        = Column(String(100))
    status      = Column(String(50), default="Draft", index=True)
    progress    = Column(Integer, default=5)
    priority    = Column(String(20), default="Medium")
    owner       = Column(String(150))
    owner_email = Column(String(255))
    objective   = Column(Text)
    target_launch = Column(String(50))
    # Comma-separated role keys e.g. "admin,source,fd"
    teams_involved = Column(String(500), default="admin")
    created_at  = Column(DateTime, server_default=func.now())
    updated_at  = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_projects_status_teams", "status", "teams_involved"),
    )

# ── Tasks ─────────────────────────────────────────────────────────────────────
class Task(Base):
    __tablename__ = "tasks"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    title           = Column(String(255), nullable=False)
    project_name    = Column(String(255))
    project_id      = Column(String(20), index=True)
    assigned_role   = Column(String(50), index=True)
    type            = Column(String(50))
    status          = Column(String(20), default="pending", index=True)
    priority        = Column(String(20), default="Medium")
    due_date        = Column(DateTime)
    due_label       = Column(String(50))

# ── Users ─────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    name          = Column(String(150), nullable=False)
    email         = Column(String(255), unique=True, nullable=False, index=True)
    role          = Column(String(50), nullable=False, index=True)
    department    = Column(String(150))
    status        = Column(String(20), default="Active")
    password_hash = Column(String(255))
    last_login    = Column(DateTime, nullable=True)
    created_at    = Column(DateTime, server_default=func.now())

# ── Audit Logs ────────────────────────────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    user_name    = Column(String(150))
    user_email   = Column(String(255), index=True)
    action       = Column(String(50))
    action_label = Column(String(255))
    entity       = Column(String(255))
    involved_roles = Column(String(500))    # comma-separated
    ip           = Column(String(100))
    time_ago     = Column(String(50))
    timestamp    = Column(DateTime, server_default=func.now(), index=True)

# ── Notifications ─────────────────────────────────────────────────────────────
class Notification(Base):
    __tablename__ = "notifications"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    target_role  = Column(String(50), nullable=False, index=True)  # role key, or "all"
    title        = Column(String(255), nullable=False)
    message      = Column(String(500), nullable=False)
    action_type  = Column(String(30), default="info")   # "project_created" | "project_updated" | "project_deleted" | "task_assigned" | "info"
    entity_id    = Column(String(30), nullable=True)    # project_id if related to a project
    entity_name  = Column(String(255), nullable=True)
    created_by   = Column(String(150))                  # admin name
    is_read      = Column(Boolean, default=False, index=True)
    created_at   = Column(DateTime, server_default=func.now(), index=True)

# ── OTP Tokens ────────────────────────────────────────────────────────────────
class OtpToken(Base):
    __tablename__ = "otp_tokens"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    email      = Column(String(255), nullable=False, index=True)
    otp        = Column(String(6), nullable=False)
    purpose    = Column(String(30), nullable=False)   # "forgot_password" | "signup_verify"
    used       = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
