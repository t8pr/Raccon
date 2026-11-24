// Forgot password logic: send the reset link, then show "check your email"
import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../../shared/api/authApi";
import AuthLayout from "./components/AuthLayout/AuthLayout";
import AuthPromo from "./components/AuthPromo/AuthPromo";
import ForgotPasswordForm from "./components/ForgotPasswordForm";
import AuthStatus from "./components/AuthStatus/AuthStatus";
import Button from "../../shared/ui/Button/Button";
import DehmScan from "./components/DehmScan/DehmScan";
import "./auth.css";
import { useTranslation } from "react-i18next";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [sentTo, setSentTo] = useState(""); // email after a successful request

  async function handleRequest(email) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setServerError("");

    try {
      await requestPasswordReset(email);
      // The server answers the same for every email, so we never say
      // whether an account exists.
      setSentTo(email);
    } catch (error) {
      if (error.status === 422) {
        setServerError(t("validation.emailInvalid"));
      } else {
        setServerError(t("auth.forgot.sendFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      showTabs={false}
      promo={
        <AuthPromo
          scene={<DehmScan />}
          mobileTitle={sentTo ? t("auth.forgot.checkEmail") : t("auth.forgot.title")}
          mobileSubTitle={
            sentTo ? "" : t("auth.forgot.mobileSubtitle")
          }
          variant="login"
        />
      }
    >
      <div className="login-page">
        {sentTo ? (
          <AuthStatus
            tone="info"
            title={t("auth.forgot.checkEmail")}
            text={t("auth.forgot.sentText", { email: sentTo })}
          >
            <p className="auth-status__hint">
              {t("auth.forgot.notReceived")}
            </p>

            <Button
              variant="secondary"
              fullWidth
              loading={isSubmitting}
              onClick={() => handleRequest(sentTo)}
            >
              {t("auth.forgot.resend")}
            </Button>

            <Link className="auth-status__link" to="/login">
              {t("auth.backToLogin")}
            </Link>
          </AuthStatus>
        ) : (
          <ForgotPasswordForm
            onSubmit={handleRequest}
            isSubmitting={isSubmitting}
            serverError={serverError}
            onEdit={() => setServerError("")}
          />
        )}
      </div>
    </AuthLayout>
  );
}
