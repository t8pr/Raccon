import HeroScanAnimation from "../ui/HeroScanAnimation";

export default function AuthPromo({
  scene,
  mobileTitle,
  mobileSubTitle,
  variant = "default",
}) {
  const redesigned = variant === "login" || variant === "register";

  return (
    <div
      className={`auth-promo auth-promo--${variant}${
        redesigned ? " auth-promo--v2" : ""
      }`}
    >
      <div className="auth-promo__scene">
        {redesigned ? <HeroScanAnimation /> : scene}
      </div>

      <div className="auth-promo__content">
        {mobileTitle && (
          <h1 className="auth-promo__mobile-title">{mobileTitle}</h1>
        )}

        {mobileSubTitle && (
          <p className="auth-promo__mobile-subtitle">{mobileSubTitle}</p>
        )}

        <h2 className="auth-promo__title">
          كل قطعة
          <br />
          {variant === "login" ? "لها سالفة" : "تحكي حكاية"}
        </h2>

        <p className="auth-promo__description">
          جهّز رحلة البحث، شاركها مع ضيوفك، وتابع مين الأول على طول.
        </p>
      </div>
    </div>
  );
}
