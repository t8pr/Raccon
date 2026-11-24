import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CircleCheck } from "lucide-react";

import AuthNavbar from "../AuthNavbar/AuthNavbar";
import Button from "../../../../shared/ui/Button/Button";
import { avatarImages } from "../../../../shared/constants/avatarImages";
import "./RegisterWelcome.css";
import { useTranslation } from "react-i18next";

export default function RegisterWelcome({ name, avatarId, status }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const isReady = status === "ready";
  const hasError = status === "error";

  useEffect(() => {
    if (!isReady) return;

    const timer = setTimeout(() => {
      navigate("/home", { replace: true });
    }, 4000); // 4 second

    return () => clearTimeout(timer);
  }, [isReady, navigate]);

  return (
    <div className="register-welcome">
      <AuthNavbar />

      <section
        className="register-welcome__body"
        aria-labelledby="welcome-title"
      >
        <div className="register-welcome__card">
          <img
            className="register-welcome__avatar"
            src={avatarImages[avatarId]}
            alt={t("auth.welcome.avatarAlt")}
          />

          <h1 id="welcome-title">
            {t("auth.welcome.greeting")} <bdi>{name}</bdi>!
          </h1>

          <p className="register-welcome__subtitle">{t("auth.welcome.ready")}</p>

          {hasError ? (
            <>
              <p role="alert">{t("auth.welcome.autoLoginFailed")}</p>

              <Button
                fullWidth
                onClick={() => navigate("/login", { replace: true })}
              >
                {t("authNav.login")}
              </Button>
            </>
          ) : (
            <Button fullWidth loading>
              {isReady ? t("auth.welcome.almostThere") : t("auth.welcome.loggingIn")}
            </Button>
          )}

          <p className="register-welcome__hint">
            {hasError
              ? t("auth.welcome.loginManually")
              : t("auth.welcome.preparing")}
          </p>
        </div>
      </section>

      {isReady && (
        <div className="register-welcome__toast" role="status">
          <CircleCheck size={22} aria-hidden="true" />
          <span>{t("auth.welcome.done")}</span>
        </div>
      )}
    </div>
  );
}
