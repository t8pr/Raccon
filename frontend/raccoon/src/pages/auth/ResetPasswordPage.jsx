// Reset password logic: the email link opens /reset-password?token=...
// 1. quick check of the link  2. new password form  3. success → back to login
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../api/auth/authApi";
import AuthLayout from "../../components/layout/AuthLayout";
import AuthPromo from "../../components/layout/AuthPromo";
import ResetPasswordForm from "../../components/auth/ResetPasswordForm";
import AuthStatus from "../../components/auth/AuthStatus";
import Button from "../../components/ui/Button";
import DehmScan from "../../components/ui/DehmScan";

// What the user reads for each kind of bad link
const LINK_ERRORS = {
  expired: {
    title: "انتهت صلاحية الرابط",
    text: "رابط إعادة التعيين صالح لمدة 15 دقيقة بس. اطلب رابط جديد وكمّل.",
  },
  invalid: {
    title: "الرابط غير صالح أو مستخدم من قبل",
    text: "كل رابط يشتغل مرة وحدة ولمدة 15 دقيقة. تأكد إنك فتحت آخر رابط وصلك كامل من الإيميل، أو اطلب رابط جديد.",
  },
};

// The reset link is a JWT. Its middle part is readable (not secret),
// so we can see if it's broken or expired before the user types anything.
// The backend still makes the real decision when the form is sent.
function readLink(token) {
  if (!token) return "invalid";

  try {
    const part = token.split(".")[1];
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));

    if (payload.purpose !== "password_reset") return "invalid";
    if (payload.exp && payload.exp * 1000 <= Date.now()) return "expired";

    return "ok";
  } catch {
    return "invalid";
  }
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const firstCheck = readLink(token);

  // form | success | linkError
  const [step, setStep] = useState(firstCheck === "ok" ? "form" : "linkError");
  const [linkError, setLinkError] = useState(firstCheck === "ok" ? "" : firstCheck);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  async function handleReset(newPassword) {
    if (isSubmitting) {
      return;
    }

    // the link may have expired while the user was typing
    if (readLink(token) === "expired") {
      setLinkError("expired");
      setStep("linkError");
      return;
    }

    setIsSubmitting(true);
    setServerError("");

    try {
      await resetPassword({ token, newPassword });
      setStep("success");
    } catch (error) {
      if (error.status === 400) {
        // backend says "Invalid reset token": expired, already used, or broken
        setLinkError(readLink(token) === "expired" ? "expired" : "invalid");
        setStep("linkError");
      } else if (error.status === 422) {
        setServerError("تأكد إن كلمة المرور من 8 إلى 72 حرفًا.");
      } else {
        setServerError("تعذر حفظ كلمة المرور. حاول مرة ثانية.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const mobileTitles = {
    form: "عيّن كلمة مرور جديدة",
    success: "تم تغيير كلمة المرور",
    linkError: LINK_ERRORS[linkError]?.title || LINK_ERRORS.invalid.title,
  };

  return (
    <AuthLayout
      showTabs={false}
      promo={
        <AuthPromo
          scene={<DehmScan />}
          mobileTitle={mobileTitles[step]}
          variant="login"
        />
      }
    >
      <div className="login-page">
        {step === "form" && (
          <ResetPasswordForm
            onSubmit={handleReset}
            isSubmitting={isSubmitting}
            serverError={serverError}
            onEdit={() => setServerError("")}
          />
        )}

        {step === "success" && (
          <AuthStatus
            tone="success"
            title="تم تغيير كلمة المرور"
            text="تقدر الحين تدخل حسابك بكلمة المرور الجديدة."
          >
            <Button
              variant="primary"
              fullWidth
              onClick={() =>
                navigate("/login", { replace: true, state: { passwordReset: true } })
              }
            >
              ارجع لتسجيل الدخول
            </Button>
          </AuthStatus>
        )}

        {step === "linkError" && (
          <AuthStatus
            tone="error"
            title={(LINK_ERRORS[linkError] || LINK_ERRORS.invalid).title}
            text={(LINK_ERRORS[linkError] || LINK_ERRORS.invalid).text}
          >
            <Button
              variant="primary"
              fullWidth
              onClick={() => navigate("/forgot-password", { replace: true })}
            >
              اطلب رابط جديد
            </Button>

            <Link className="auth-status__link" to="/login">
              ارجع لتسجيل الدخول
            </Link>
          </AuthStatus>
        )}
      </div>
    </AuthLayout>
  );
}
