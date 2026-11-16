import resend
from core.config import settings
from core.logger import logger

SENDER = "Raccon <raccon@raccon.app>" # will be updated soon

def send_password_reset_email(to_email: str, token:str) -> None:
    resend.api_key = settings.RESEND_API_KEY
    link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
    try:
        resend.Emails.send({
            "from": SENDER,
            "to": [to_email],
            "subject": "Reset your password",
            "text": (
                "We received a request to reset your password.\n\n"
                f"Open this link within 15 minutes to choose a new password:\n{link}\n\n"
                "If you didn't ask for this, you can ignore this email."
            ),
            "html": (
                "<p>We received a request to reset your password.</p>"
                f'<p><a href="{link}">Reset your password</a></p>'
                "<p>This link expires in 15 minutes. "
                "If you didn't ask for this, you can ignore this email.</p>"
            ),
        })
    except Exception as e:
        logger.exception(f"Failed to send password reset email.")
