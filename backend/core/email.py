from pathlib import Path
from urllib.parse import urlencode
import resend
from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape
from core.config import settings
from core.logger import logger

SENDER = "Raccon <raccon@raccon.app>" # updated
resend.api_key = settings.RESEND_API_KEY

templates = Environment(
    loader=FileSystemLoader(Path(__file__).resolve().parents[1] / "templates"),
    autoescape=select_autoescape(["html"]),
    undefined=StrictUndefined,
)

# Base
def _send_auth_email(
    to_email: str,
    *,
    title: str,
    preheader: str,
    body: str,
    link: str,
    button_label: str,
    notice: str,
    is_reset: bool,
) -> None:
    try:
        html = templates.get_template("reset_email.html").render(
            title=title,
            preheader=preheader,
            body=body,
            link=link,
            button_label=button_label,
            notice=notice,
            is_reset=is_reset,
            logo_url=f"{settings.FRONTEND_URL.rstrip('/')}/raccon.png",
        )

        text_parts = [title, body, link]
        if is_reset:
            text_parts.append("ينتهي هذا الرابط خلال ١٥ دقيقة.")
        text_parts.append(notice)

        resend.Emails.send({
            "from": SENDER,
            "to": [to_email],
            "subject": title,
            "html": html,
            "text": "\n\n".join(text_parts),
        })
    except Exception as exc:
        logger.error(
            "Failed to send auth email (is_reset=%s, error_type=%s)",
            is_reset,
            type(exc).__name__,
        )


def send_password_reset_email(to_email: str, token: str) -> None:
    origin = settings.FRONTEND_URL.rstrip("/")
    query = urlencode({"token": token})
    _send_auth_email(
        to_email,
        title="إعادة تعيين كلمة المرور",
        preheader="استخدم هذا الرابط خلال ١٥ دقيقة لاختيار كلمة مرور جديدة.",
        body="وصلنا طلب لإعادة تعيين كلمة المرور الخاصة بحسابك في راكون.",
        link=f"{origin}/reset-password?{query}",
        button_label="إعادة تعيين كلمة المرور",
        notice="إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة بأمان.",
        is_reset=True,
    )


def send_reset_confirmation_email(to_email: str) -> None:
    origin = settings.FRONTEND_URL.rstrip("/")
    _send_auth_email(
        to_email,
        title="تمت إعادة تعيين كلمة المرور بنجاح",
        preheader="تم تغيير كلمة المرور الخاصة بك.",
        body="يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
        link=f"{origin}/login",
        button_label="افتح راكون",
        notice="لم تكن أنت؟ أعد تعيين كلمة المرور فورًا وتواصل معنا.",
        is_reset=False,
    )