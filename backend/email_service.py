"""
NEUROSCAN AI — Email & OTP Service
===================================
Handles transactional emails and OTP delivery via SMTP.
If SMTP credentials are not configured, securely logs the action
and provides developer mock output without crashing.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from config import (
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD,
    SMTP_FROM, SMTP_USE_TLS, IS_PRODUCTION
)


def is_smtp_configured() -> bool:
    """Returns True if minimum required SMTP settings are present."""
    return bool(SMTP_HOST and SMTP_PORT and SMTP_FROM)


def send_otp_email(to_email: str, otp_code: str, purpose: str = "login") -> bool:
    """
    Sends a 6-digit OTP verification email with clinical branding.
    Falls back to server log if SMTP credentials have not been configured yet.
    """
    subject_map = {
        "login": "NeuroVision — Your Clinical Authentication Code",
        "register": "NeuroVision — Complete Your Account Registration",
        "reset_password": "NeuroVision — Password Reset Verification Code",
    }
    subject = subject_map.get(purpose, "NeuroVision — Verification Code")

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>{subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1120; color: #f8fafc; padding: 32px 16px;">
      <div style="max-width: 520px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #38bdf8; font-size: 24px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">NEUROVISION AI</h1>
          <p style="color: #64748b; font-size: 11px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">Clinical PACS Intelligence Platform</p>
        </div>
        
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          A security verification request was initiated for your institutional account (<strong>{to_email}</strong>). Use the one-time code below to complete authorization:
        </p>

        <div style="background: #0284c71a; border: 1px solid #0284c740; border-radius: 12px; text-align: center; padding: 20px; margin-bottom: 24px;">
          <span style="font-family: monospace; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #38bdf8;">{otp_code}</span>
          <p style="color: #64748b; font-size: 11px; margin-top: 8px; margin-bottom: 0;">Valid for 10 minutes • Single-use only</p>
        </div>

        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-bottom: 24px;">
          If you did not request this verification code, please inform your institution's system administrator immediately.
        </p>

        <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="color: #475569; font-size: 10px; text-align: center; margin: 0;">
          NeuroVision Medical AI System • Research & Clinical Decision Support • End-to-End Encrypted Session
        </p>
      </div>
    </body>
    </html>
    """

    if not is_smtp_configured():
        print(f"\n[EmailService] ✉️  [MOCK DISPATCH] OTP for {to_email}: >>> {otp_code} <<< (Purpose: {purpose})")
        print("[EmailService] ℹ️  SMTP is not configured in .env. Real email delivery will be enabled once SMTP credentials are provided.\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to_email

        text_part = MIMEText(f"Your NeuroVision verification code is: {otp_code}. Valid for 10 minutes.", "plain")
        html_part = MIMEText(html_content, "html")
        msg.attach(text_part)
        msg.attach(html_part)

        if SMTP_USE_TLS:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10)

        if SMTP_USER and SMTP_PASSWORD:
            server.login(SMTP_USER, SMTP_PASSWORD)

        server.sendmail(SMTP_FROM, [to_email], msg.as_string())
        server.quit()
        print(f"[EmailService] Successfully sent OTP email to {to_email}")
        return True
    except Exception as e:
        print(f"[EmailService] Failed to send email via SMTP to {to_email}: {e}")
        return False
