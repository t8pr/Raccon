// Reset password logic: the email link opens /reset-password?token=...
// 1. quick check of the link  2. new password form  3. success → back to login
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../shared/api/authApi";
import AuthLayout from "./components/AuthLayout/AuthLayout";
import AuthPromo from "./components/AuthPromo/AuthPromo";
import ResetPasswordForm from "./components/ResetPasswordForm";
import AuthStatus from "./components/AuthStatus/AuthStatus";
import Button from "../../shared/ui/Button/Button";
import DehmScan from "./components/DehmScan/DehmScan";
import "./auth.css";
import { useTranslation } from "react-i18next";

// What the user reads for each kind of bad link (translation keys)
const LINK_ERRORS = {
  expired: {
    title: "auth.reset.expiredTitle",
    text: "auth.reset.expiredText",
  },
  invalid: {
    title: "auth.reset.invalidTitle",
    text: "auth.reset.invalidText",
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
  const { t } = useTranslation();
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
        setServerError(t("auth.reset.lengthError"));
      } else {
        setServerError(t("auth.reset.saveFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const mobileTitles = {
    form: t("auth.reset.title"),
    success: t("auth.reset.successTitle"),
    linkError: t(LINK_ERRORS[linkError]?.title || LINK_ERRORS.invalid.title),
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
            title={t("auth.reset.successTitle")}
            text={t("auth.reset.successText")}
          >
            <Button
              variant="primary"
              fullWidth
              onClick={() =>
                navigate("/login", { replace: true, state: { passwordReset: true } })
              }
            >
              {t("auth.backToLogin")}
            </Button>
          </AuthStatus>
        )}

        {step === "linkError" && (
          <AuthStatus
            tone="error"
            title={t((LINK_ERRORS[linkError] || LINK_ERRORS.invalid).title)}
            text={t((LINK_ERRORS[linkError] || LINK_ERRORS.invalid).text)}
          >
            <Button
              variant="primary"
              fullWidth
              onClick={() => navigate("/forgot-password", { replace: true })}
            >
              {t("auth.reset.requestNew")}
            </Button>

            <Link className="auth-status__link" to="/login">
              {t("auth.backToLogin")}
            </Link>
          </AuthStatus>
        )}
      </div>
    </AuthLayout>
  );
}
