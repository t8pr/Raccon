import "./AuthPromo.css";
import { useTranslation } from "react-i18next";

// The promo side of the auth pages: scan animation + headline
export default function AuthPromo({
  scene,
  mobileTitle,
  mobileSubTitle,
  variant = "default",
}) {
  const { t } = useTranslation();
  return (
    <div className={`auth-promo auth-promo--${variant} auth-promo--v2`}>
      {/* Scan animation */}
      <div className="auth-promo__scene">{scene}</div>

      {/* Content */}
      <div className="auth-promo__content">
        {/* Mobile Title and subtitle */}
        {mobileTitle && (
          <h1 className="auth-promo__mobile-title">{mobileTitle}</h1>
        )}
        {mobileSubTitle && (
          <p className="auth-promo__mobile-subtitle">{mobileSubTitle}</p>
        )}

        {/* Desktop Title */}
        <h2 className="auth-promo__title">
          {t("auth.promo.titleLine1")}
          <br />
          {t("auth.promo.titleLine2")}
        </h2>

        <p className="auth-promo__description">
          {t("auth.promo.description")}
        </p>
      </div>
    </div>
  );
}
