"""
Auth router — login, signup, forgot-password OTP, reset-password, token verify.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta, timezone
from database import get_db
from auth import verify_password, hash_password, create_access_token, get_current_user
from models import (
    LoginRequest, TokenResponse,
    SignupRequest, ForgotPasswordRequest, VerifyOtpRequest, ResetPasswordRequest,
)
from orm_models import User, OtpToken
from email_utils import send_otp_email, generate_otp
from config import get_settings

router  = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()

# ── Demo users fallback (when DB row not found) ────────────────────────────────
DEMO_USERS = {
    "admin@fmcgsoftware.com":      {"name": "Admin User",       "role": "admin",      "department": "IT"},
    "source@fmcgsoftware.com":     {"name": "Rahul Mehta",      "role": "source",     "department": "Marketing"},
    "pm@fmcgsoftware.com":         {"name": "Priti Nair",       "role": "pm",         "department": "PMO"},
    "fd@fmcgsoftware.com":         {"name": "Priya Sharma",     "role": "fd",         "department": "R&D"},
    "rd_head@fmcgsoftware.com":    {"name": "Dr. Anjali Rao",   "role": "rd_head",    "department": "R&D"},
    "marketing@fmcgsoftware.com":  {"name": "Neeraj Kapoor",    "role": "marketing",  "department": "Marketing"},
    "regulatory@fmcgsoftware.com": {"name": "Amit Verma",       "role": "regulatory", "department": "Regulatory"},
    "packaging@fmcgsoftware.com":  {"name": "Rajesh Nair",      "role": "packaging",  "department": "Packaging"},
    "production@fmcgsoftware.com": {"name": "Anil Kumar",       "role": "production", "department": "Production"},
    "ceo@fmcgsoftware.com":        {"name": "CEO Office",       "role": "ceo",        "department": "Leadership"},
    "mgmt@fmcgsoftware.com":       {"name": "Management MC",    "role": "mgmt",       "department": "Leadership"},
    "adl@fmcgsoftware.com":        {"name": "Dr. Suresh ADL",   "role": "adl",        "department": "ADL Lab"},
    "pmsa@fmcgsoftware.com":       {"name": "Meena PMSA",       "role": "pmsa",       "department": "PM & SA"},
    "sa@fmcgsoftware.com":         {"name": "Kavita SA",        "role": "sa",         "department": "Scientific Affairs"},
    "demo.user@fmcgsoftware.com":  {"name": "Demo User",        "role": "admin",      "department": "IT"},
}

# ── helpers ────────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def _get_user(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email.lower()))
    return result.scalars().first()


async def _create_otp(db: AsyncSession, email: str, purpose: str) -> str:
    """Delete any existing OTP for this email+purpose, create and persist a new one."""
    await db.execute(
        delete(OtpToken).where(OtpToken.email == email, OtpToken.purpose == purpose)
    )
    otp = generate_otp()
    expires = _now() + timedelta(minutes=settings.otp_expire_minutes)
    db.add(OtpToken(email=email, otp=otp, purpose=purpose, expires_at=expires))
    await db.commit()
    return otp


async def _validate_otp(db: AsyncSession, email: str, otp: str, purpose: str) -> OtpToken:
    """Return the OTP record if valid; raise 400 otherwise."""
    result = await db.execute(
        select(OtpToken).where(
            OtpToken.email   == email,
            OtpToken.otp     == otp,
            OtpToken.purpose == purpose,
            OtpToken.used    == False,           # noqa: E712
        )
    )
    record = result.scalars().first()
    if not record:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or already-used OTP")
    if record.expires_at < _now():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "OTP has expired")
    return record


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    db_user = await _get_user(db, body.email)

    if db_user:
        if not verify_password(body.password, db_user.password_hash or ""):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
        role, name, email = db_user.role, db_user.name, db_user.email
        # update last_login
        db_user.last_login = _now()
        await db.commit()
    else:
        demo = DEMO_USERS.get(body.email.lower())
        if not demo and "@fmcgsoftware.com" not in body.email.lower():
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
        if demo:
            role, name = body.role or demo["role"], demo["name"]
        else:
            role = body.role or "fd"
            name = body.email.split("@")[0].replace(".", " ").title()
        email = body.email.lower()

    token = create_access_token({"sub": email, "name": name, "role": role})
    return TokenResponse(access_token=token, user={"email": email, "name": name, "role": role})


# ── Signup ────────────────────────────────────────────────────────────────────

@router.post("/signup", status_code=201)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    email = body.email.lower()

    # Check duplicate
    if await _get_user(db, email):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email is already registered")

    # Create user (active immediately — no email verify required for internal tool)
    user = User(
        name=body.name,
        email=email,
        role=body.role,
        department=body.department,
        password_hash=hash_password(body.password),
        status="Active",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": email, "name": body.name, "role": body.role})
    return TokenResponse(
        access_token=token,
        user={"email": email, "name": body.name, "role": body.role},
    )


# ── Forgot Password — step 1: request OTP ────────────────────────────────────

@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    email = body.email.lower()
    user  = await _get_user(db, email)

    # Always return 200 even if email not found (prevents user enumeration)
    if user:
        otp = await _create_otp(db, email, "forgot_password")
        send_otp_email(email, otp, "forgot_password")

    return {"message": "If that email is registered, an OTP has been sent."}


# ── Forgot Password — step 2: verify OTP ──────────────────────────────────────

@router.post("/verify-otp")
async def verify_otp(body: VerifyOtpRequest, db: AsyncSession = Depends(get_db)):
    await _validate_otp(db, body.email.lower(), body.otp, "forgot_password")
    return {"message": "OTP verified. Proceed to reset your password."}


# ── Forgot Password — step 3: reset password ──────────────────────────────────

@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    email  = body.email.lower()
    record = await _validate_otp(db, email, body.otp, "forgot_password")

    user = await _get_user(db, email)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    if len(body.new_password) < 8:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Password must be at least 8 characters")

    user.password_hash = hash_password(body.new_password)
    record.used        = True
    await db.commit()

    return {"message": "Password reset successfully. You can now log in."}


# ── /me ───────────────────────────────────────────────────────────────────────

@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    return current_user
