import "./AuthPromo.css";

// The promo side of the auth pages: scan animation + headline
export default function AuthPromo({
  scene,
  mobileTitle,
  mobileSubTitle,
  variant = "default",
}) {
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
          كل قطعة
          <br />
          تخبّي حكاية.
        </h2>

        <p className="auth-promo__description">
          جهّز رحلة البحث، شاركها مع ضيوفك، وتابع مين الأول على طول.
        </p>
      </div>
    </div>
  );
}
