import Button from "../../../shared/ui/Button";

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
  return (
    <section className="Round-settings">
      <h2>إعدادات الجولة</h2>

      <div className="Round-settings__actions">
        <Button
          onClick={onToggleRound}
          loading={isStarting}
          disabled={!canChangeRoundStatus}
          variant={isLive ? "outline" : "primary"}
          className={isLive ? "round-stop" : ""}
        >
          {isLive ? "إنهاء الجولة" : "ابدأ الجولة"}
        </Button>

        <Button onClick={onRequestEdit} disabled={!canRequestEdit}>
          تعديل الباقة
        </Button>
      </div>

      {!isLive && !allTagsReady && (
        <p className="customization-note">
          احفظ جميع القطع لتتمكن من بدء الجولة، حتى القطع الفارغة
        </p>
      )}

      {startError && <p role="alert">{startError}</p>}
    </section>
  );
}
