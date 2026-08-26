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

# ── PPD Status enum ───────────────────────────────────────────────────────────
# Full workflow:
#   Pending  → Rework (reviewer sends back)
#   Pending  → ReviewerApproved (all initial reviewers approved; Source must still submit)
#   ReviewerApproved → SubmittedForApproval (Source clicks "Submit for Approval")
#   SubmittedForApproval → Approved (Management / final approver signs off)
class PPDStatus(str, enum.Enum):
    Pending               = "Pending"
    Rework                = "Rework"
    ReviewerApproved      = "ReviewerApproved"   # R&D+FD approved; awaiting Source submission
    SubmittedForApproval  = "SubmittedForApproval"  # Source submitted to Management
    Approved              = "Approved"

# ── Enums ─────────────────────────────────────────────────────────────────────
class TaskStatus(str, enum.Enum):
    pending     = "pending"
    rework      = "rework"
    approved    = "approved"

class UserStatus(str, enum.Enum):
    Active   = "Active"
    Inactive = "Inactive"

# ── Tasks ─────────────────────────────────────────────────────────────────────
class Task(Base):
    __tablename__ = "tasks"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    title           = Column(String(255), nullable=False)
    project_name    = Column(String(255))
    project_id      = Column(String(20), index=True)
    ppd_id          = Column(String(50), index=True)
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
    action_type  = Column(String(30), default="info")
    entity_id    = Column(String(30), nullable=True)
    entity_name  = Column(String(255), nullable=True)
    created_by   = Column(String(150))
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

# ── PPD Submissions ───────────────────────────────────────────────────────────
class PPDSubmission(Base):
    """
    One PPD document per product initiative.  PPD is the top-level entity.
    project_name and brand are stored directly on PPD (no FK to a projects table).
    """
    __tablename__ = "ppd_submissions"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    ppd_id              = Column(String(50), unique=True, nullable=False, index=True)   # e.g. PPD-ZW-2026-001
    project_name        = Column(String(255))
    ppd_title           = Column(String(255))
    brand               = Column(String(100))
    product_category    = Column(String(150))
    target_consumer     = Column(String(255))
    market_segment      = Column(String(150))
    expected_launch     = Column(String(50))
    objective           = Column(Text)
    key_benefits        = Column(Text)

    status              = Column(String(50), default="Pending", index=True)
    ppd_version         = Column(String(10), default="v1.0")

    # Comma-separated role keys
    # While Pending/Rework: contains only the directly involved roles (creator + reviewers)
    # After Approved: expanded to full_teams_involved (all relevant roles)
    teams_involved      = Column(String(500), default="admin,source,pm,fd")

    # Full post-approval visibility — set at creation, applied when PPD is Approved
    full_teams_involved = Column(String(500), default="admin,source,pm,fd,rd_head,marketing,regulatory,packaging,adl,pmsa,sa,mgmt,ceo,production")

    # Owner / submitter info
    created_by          = Column(String(150))
    created_by_email    = Column(String(255))
    created_by_role     = Column(String(50))

    # Review & approval state stored as JSON list of dicts
    reviewers           = Column(JSON, default=list)
    mgmt_approvals      = Column(JSON, default=list)

    created_at          = Column(DateTime, server_default=func.now())
    updated_at          = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_ppd_status_teams", "status", "teams_involved"),
    )


# ── PPD Comments ──────────────────────────────────────────────────────────────
class PPDComment(Base):
    __tablename__ = "ppd_comments"

    id                = Column(Integer, primary_key=True, autoincrement=True)
    ppd_id            = Column(String(50), nullable=False, index=True)
    user_name         = Column(String(150))
    user_role         = Column(String(50))
    comment           = Column(Text, nullable=False)
    action_tag        = Column(String(30), default="comment")   # "comment" | "rework" | "approve" | "rework_reply" | "rework_done"
    attachment_url    = Column(String(500), nullable=True)      # uploaded file URL (optional)
    attachment_name   = Column(String(255), nullable=True)      # original filename for display
    rework_resolved   = Column(Boolean, default=False)          # True once rework is completed & resubmitted
    visible_to_roles  = Column(String(500), nullable=True)      # NULL = all; CSV of role keys if restricted
    created_at        = Column(DateTime, server_default=func.now(), index=True)


# ── Formulation ───────────────────────────────────────────────────────────────
class Formula(Base):
    __tablename__ = "formulas"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    formula_id      = Column(String(30), unique=True, nullable=False, index=True)  # e.g. F-ZW-2026-001
    ppd_id          = Column(String(50), nullable=True, index=True)
    project_name    = Column(String(255))
    version         = Column(String(10), default="v1.0")
    formula_type    = Column(String(50), default="Trial")
    status          = Column(String(50), default="Draft")
    protein_source  = Column(String(255))
    sweetener       = Column(String(255))
    cocoa_pct       = Column(String(20))
    protein_pct     = Column(String(20))
    sugar_per_100g  = Column(String(20))
    cost_per_kg     = Column(String(20))
    stability_40c   = Column(String(50))
    sensory_score   = Column(String(20))
    notes           = Column(Text)
    ingredients     = Column(JSON, default=list)
    created_by      = Column(String(150))
    created_by_role = Column(String(50))
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_formula_ppd", "ppd_id"),
    )


class FormulaComment(Base):
    __tablename__ = "formula_comments"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    formula_id  = Column(String(30), nullable=False, index=True)
    user_name   = Column(String(150))
    user_role   = Column(String(50))
    comment     = Column(Text, nullable=False)
    created_at  = Column(DateTime, server_default=func.now(), index=True)


# ── E-Lab Notebook ────────────────────────────────────────────────────────────
class LabExperiment(Base):
    __tablename__ = "lab_experiments"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    exp_id          = Column(String(30), unique=True, nullable=False, index=True)
    ppd_id          = Column(String(50), nullable=True, index=True)
    project_name    = Column(String(255))
    title           = Column(String(255), nullable=False)
    batch_no        = Column(String(50))
    temperature     = Column(String(30))
    duration        = Column(String(50))
    observations    = Column(Text)
    result          = Column(String(100))
    status          = Column(String(30), default="Active")
    formula_id      = Column(String(30), nullable=True)
    version         = Column(String(10), nullable=True)
    created_by      = Column(String(150))
    created_by_role = Column(String(50))
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (Index("ix_lab_ppd", "ppd_id"),)


# ── Plant Trials ──────────────────────────────────────────────────────────────
class PlantTrial(Base):
    __tablename__ = "plant_trials"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    trial_id        = Column(String(30), unique=True, nullable=False, index=True)
    ppd_id          = Column(String(50), nullable=True, index=True)
    project_name    = Column(String(255))
    plant_location  = Column(String(150))
    batch_size      = Column(String(50))
    stage           = Column(String(50))
    status          = Column(String(30), default="Scheduled")
    bom_code        = Column(String(50))
    mfc_code        = Column(String(50))
    product_code    = Column(String(50))
    sfg_code        = Column(String(50))
    notes           = Column(Text)
    scheduled_date  = Column(String(30))
    completed_date  = Column(String(30))
    created_by      = Column(String(150))
    created_by_role = Column(String(50))
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (Index("ix_trial_ppd", "ppd_id"),)


# ── Regulatory ────────────────────────────────────────────────────────────────
class RegulatoryCheck(Base):
    __tablename__ = "regulatory_checks"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    reg_id          = Column(String(30), unique=True, nullable=False, index=True)
    ppd_id          = Column(String(50), nullable=True, index=True)
    project_name    = Column(String(255))
    check_type      = Column(String(100))
    ingredient_or_claim = Column(String(255))
    assigned_to     = Column(String(150))
    assigned_role   = Column(String(50))
    due_date        = Column(String(30))
    status          = Column(String(30), default="Pending")
    notes           = Column(Text)
    created_by      = Column(String(150))
    created_by_role = Column(String(50))
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (Index("ix_reg_ppd", "ppd_id"),)


# ── Sensory & Analytical ──────────────────────────────────────────────────────
class SensoryEvaluation(Base):
    __tablename__ = "sensory_evaluations"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    eval_id         = Column(String(30), unique=True, nullable=False, index=True)
    ppd_id          = Column(String(50), nullable=True, index=True)
    project_name    = Column(String(255))
    formula_id      = Column(String(30))
    panel_size      = Column(Integer, default=0)
    eval_date       = Column(String(30))
    overall_score   = Column(String(10))
    aroma           = Column(String(10))
    taste           = Column(String(10))
    mouthfeel       = Column(String(10))
    aftertaste      = Column(String(10))
    adl_protein_pct = Column(String(20))
    adl_fat_pct     = Column(String(20))
    adl_moisture    = Column(String(20))
    adl_ash         = Column(String(20))
    adl_apc         = Column(String(50))
    adl_ecoli       = Column(String(30))
    status          = Column(String(30), default="Pending")
    notes           = Column(Text)
    created_by      = Column(String(150))
    created_by_role = Column(String(50))
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (Index("ix_sensory_ppd", "ppd_id"),)


# ── Costing ───────────────────────────────────────────────────────────────────
class CostingRecord(Base):
    __tablename__ = "costing_records"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    cost_id         = Column(String(30), unique=True, nullable=False, index=True)
    ppd_id          = Column(String(50), nullable=True, index=True)
    project_name    = Column(String(255))
    formula_id      = Column(String(30))
    cost_breakdown  = Column(JSON, default=list)
    total_cost_per_kg = Column(String(20))
    packaging_items = Column(JSON, default=list)
    status          = Column(String(30), default="Draft")
    notes           = Column(Text)
    created_by      = Column(String(150))
    created_by_role = Column(String(50))
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (Index("ix_costing_ppd", "ppd_id"),)


# ── Claim Substantiation ──────────────────────────────────────────────────────
class ClaimRecord(Base):
    __tablename__ = "claim_records"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    claim_id        = Column(String(30), unique=True, nullable=False, index=True)
    ppd_id          = Column(String(50), nullable=True, index=True)
    project_name    = Column(String(255))
    claim_text      = Column(String(500), nullable=False)
    evidence        = Column(Text)
    assigned_to     = Column(String(150))
    assigned_role   = Column(String(50))
    status          = Column(String(30), default="Pending")
    notes           = Column(Text)
    created_by      = Column(String(150))
    created_by_role = Column(String(50))
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (Index("ix_claim_ppd", "ppd_id"),)


# ── Artwork Briefs ────────────────────────────────────────────────────────────
class ArtworkBrief(Base):
    __tablename__ = "artwork_briefs"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    artwork_id      = Column(String(30), unique=True, nullable=False, index=True)
    ppd_id          = Column(String(50), nullable=True, index=True)
    project_name    = Column(String(255))
    brand           = Column(String(100))
    version         = Column(String(10), default="v1.0")
    artwork_type    = Column(String(50))
    sku             = Column(String(100))
    brief_notes     = Column(Text)
    design_link     = Column(String(500))
    comment         = Column(Text)
    status          = Column(String(30), default="Brief Pending")
    created_by      = Column(String(150))
    created_by_role = Column(String(50))
    assigned_to     = Column(String(150))
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (Index("ix_artwork_ppd", "ppd_id"),)


# ── Role Permissions ──────────────────────────────────────────────────────────
class RolePermission(Base):
    """
    Stores per-role, per-module permission flags.
    One row per (role, module) pair.
    permissions stored as JSON: { "view": bool, "create": bool, "edit": bool,
                                   "submit": bool, "approve": bool, "delete": bool }
    """
    __tablename__ = "role_permissions"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    role        = Column(String(50), nullable=False, index=True)
    module      = Column(String(100), nullable=False)
    permissions = Column(JSON, default=dict)
    updated_at  = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_roleperm_role_module", "role", "module"),
    )


# ── Master Config (brands, project types, raw materials) ──────────────────────
class MasterConfig(Base):
    __tablename__ = "master_config"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    config_type = Column(String(50), nullable=False, index=True)
    key        = Column(String(100), nullable=False)
    label      = Column(String(255), nullable=False)
    meta       = Column(JSON, default=dict)
    is_active  = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (Index("ix_master_type_key", "config_type", "key"),)
