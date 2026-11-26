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
import HeroScanAnimation from "./components/HeroScanAnimation";
import "./auth.css";
import { useTranslation } from "react-i18next";

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  // form | success | linkError
  const [step, setStep] = useState(token ? "form" : "linkError");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  async function handleReset(newPassword) {
    if (isSubmitting) {
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
    linkError: t("auth.reset.invalidTitle"),
  };

  return (
    <AuthLayout
      showTabs={false}
      promo={
        <AuthPromo
          scene={<HeroScanAnimation />}
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
            title={t("auth.reset.invalidTitle")}
            text={t("auth.reset.invalidText")}
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
