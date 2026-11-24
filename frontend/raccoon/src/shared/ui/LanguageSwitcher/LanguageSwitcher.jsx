import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import "./LanguageSwitcher.css";

// زر يبدّل بين العربية والإنجليزية؛ النص المعروض هو اللغة اللي بينتقل لها
export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const next = i18n.resolvedLanguage === "ar" ? "en" : "ar";

  return (
    <button
      type="button"
      className="lang-switch"
      aria-label={t("language.label")}
      onClick={() => i18n.changeLanguage(next)}
    >
      <Languages size={20} strokeWidth={1.7} aria-hidden="true" />
      <span lang={next}>{t("language.switchTo")}</span>
    </button>
  );
}
