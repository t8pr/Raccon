import Button from "../../../shared/ui/Button/Button";
import { useTranslation } from "react-i18next";

// إعدادات الجولة: بدء/إنهاء الجولة، وطلب تعديل الباقة.
// عرض فقط: القرارات (canChangeRoundStatus, canRequestEdit) تُحسب في CustomizationPage.
export default function RoundSettings({
  isLive,
  isStarting,
  canChangeRoundStatus,
  canRequestEdit,
  allTagsReady,
  startError,
  onToggleRound,
  onRequestEdit,
}) {
  const { t } = useTranslation();
  return (
    <section className="Round-settings">
      <h2>{t("customization.round.title")}</h2>

      <div className="Round-settings__actions">
        <Button
          onClick={onToggleRound}
          loading={isStarting}
          disabled={!canChangeRoundStatus}
          variant={isLive ? "outline" : "primary"}
          className={isLive ? "round-stop" : ""}
        >
          {isLive ? t("customization.round.end") : t("customization.round.start")}
        </Button>

        <Button onClick={onRequestEdit} disabled={!canRequestEdit}>
          {t("customization.round.editPackage")}
        </Button>
      </div>

      {!isLive && !allTagsReady && (
        <p className="customization-note">
          {t("customization.round.saveAllFirst")}
        </p>
      )}

      {startError && <p role="alert">{startError}</p>}
    </section>
  );
}
