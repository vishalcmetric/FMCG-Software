"""
Email utility — sends OTP emails via SMTP.
Configure SMTP settings in .env. Falls back to console-print if SMTP not configured.
"""
import smtplib
import random
import string
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from config import get_settings

settings = get_settings()


def generate_otp(length: int = 6) -> str:
    """Generate a numeric OTP of given length."""
    return "".join(random.choices(string.digits, k=length))


def _build_html(otp: str, purpose: str) -> str:
    title  = "Password Reset OTP" if purpose == "forgot_password" else "Email Verification OTP"
    action = "reset your password" if purpose == "forgot_password" else "verify your email"
    return f"""
<!DOCTYPE html>
<html>
<body style="font-family: 'Segoe UI', sans-serif; background:#f7f8fa; margin:0; padding:40px;">
  <div style="max-width:480px; margin:auto; background:#fff; border-radius:12px;
              border:1px solid #e5e7eb; overflow:hidden;">
    <div style="background:#1e293b; padding:28px 32px;">
     <h1 style="color:#fff; margin:0; font-size:20px;">FMCG Software</h1>
     <p  style="color:#94a3b8; margin:4px 0 0; font-size:13px;">Product Development Platform</p>
   </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px; color:#1f2328; font-size:18px;">{title}</h2>
      <p style="color:#57606a; margin:0 0 24px; font-size:14px; line-height:1.6;">
        Use the OTP below to {action}. It expires in <strong>10 minutes</strong>.
      </p>
      <div style="background:#f0fdf4; border:2px dashed #22c55e; border-radius:10px;
                  text-align:center; padding:20px;">
        <span style="font-size:36px; font-weight:700; letter-spacing:10px;
                     color:#166534; font-family:monospace;">{otp}</span>
      </div>
      <p style="color:#57606a; font-size:13px; margin:20px 0 0; line-height:1.6;">
        If you did not request this, please ignore this email.
        This OTP is valid for a single use only.
      </p>
    </div>
    <div style="background:#f7f8fa; padding:16px 32px; border-top:1px solid #e5e7eb;">
      <p style="color:#57606a; font-size:12px; margin:0;">
        &copy; 2026 FMCG Software. &nbsp;|&nbsp; Confidential &amp; Proprietary
      </p>
    </div>
  </div>
</body>
</html>
"""


def send_otp_email(to_email: str, otp: str, purpose: str) -> bool:
    """
    Send OTP email. Returns True on success.
    If SMTP is not configured, prints to console and returns True (dev mode).
    """
    if not settings.smtp_host or not settings.smtp_user:
        # Dev / demo mode — just print to console
        print(f"\n[DEV] OTP for {to_email} ({purpose}): {otp}\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Your FMCG Software OTP: {otp}"
        msg["From"]    = f"FMCG Software <{settings.smtp_user}>"
        msg["To"]      = to_email

        msg.attach(MIMEText(_build_html(otp, purpose), "html"))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.ehlo()
            if settings.smtp_tls:
                server.starttls()
            if settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_user, to_email, msg.as_string())
        return True
    except Exception as exc:
        print(f"[EMAIL ERROR] Failed to send OTP to {to_email}: {exc}")
        return False
