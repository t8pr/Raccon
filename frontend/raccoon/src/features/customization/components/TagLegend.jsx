import { useTranslation } from "react-i18next";
export default function TagLegend() {
  const { t } = useTranslation();
  return (
    <div className="tag-legend" aria-label={t("customization.legend.label")}>
      <span>
        <i
          className="tag-legend__dot tag-legend__dot--saved"
          aria-hidden="true"
        />
        {t("customization.legend.ready")}
      </span>

      <span>
        <i
          className="tag-legend__dot tag-legend__dot--current"
          aria-hidden="true"
        />
        {t("customization.legend.current")}
      </span>

      <span>
        <i
          className="tag-legend__dot tag-legend__dot--empty"
          aria-hidden="true"
        />
        {t("customization.legend.unsaved")}
      </span>

      <span>
        <i
          className="tag-legend__dot tag-legend__dot--trap"
          aria-hidden="true"
        />
        {t("customization.legend.trapped")}
      </span>
    </div>
  );
}
