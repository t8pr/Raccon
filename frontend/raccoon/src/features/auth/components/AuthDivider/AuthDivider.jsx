import "./AuthDivider.css";
import { useTranslation } from "react-i18next";

export default function AuthDivider({ label }) {
  const { t } = useTranslation();
  label = label ?? t("common.or");
  return (
    <div className="auth-divider" role="separator" aria-label={label}>
      <span>{label}</span>
    </div>
  );
}
