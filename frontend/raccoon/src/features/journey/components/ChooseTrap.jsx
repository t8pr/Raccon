import { useRef, useState } from "react";
import { setPlayerTrap } from "../api";
import {
  FREEZE_DEFAULT_SECONDS,
  isValidFreezeSeconds,
} from "../../../shared/utils/trapRules";
import Button from "../../../shared/ui/Button/Button";
import InlineMessage from "../../../shared/ui/InlineMessage/InlineMessage";
import ScanLayout from "./ScanLayout/ScanLayout";
import TrapPicker from "./TrapPicker/TrapPicker";
import { BombBadge, FreezeBadge } from "./ScanBadges/ScanBadges";
import { useTranslation } from "react-i18next";

// قطعة فخ من نوع «اختر»: اللاعب يحدد النوع ومدة التجميد ثم يزرع الفخ.
// shell: الخصائص المشتركة لـ ScanLayout (اسم الجولة، المتصدرون) تأتي من ScanPage.
export default function ChooseTrap({
  shell,
  tagHash,
  userHash,
  currentScore,
  remainingTags,
  onActivated,
}) {
  const { t } = useTranslation();
  const [type, setType] = useState("freeze");
  const [seconds, setSeconds] = useState(FREEZE_DEFAULT_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  const isFreeze = type === "freeze";
  const canSubmit = !isFreeze || isValidFreezeSeconds(seconds);

  async function activate() {
    if (inFlight.current || !canSubmit) return;

    // بووم قيمته ثابتة 1، والتجميد بعدد الثواني المختار
    const value = isFreeze ? Number(seconds) : 1;

    inFlight.current = true;
    setSubmitting(true);
    setError("");
    try {
      const result = await setPlayerTrap(tagHash, userHash, type, value);
      onActivated(result);
    } catch (err) {
      setError(
        typeof err.detail === "string"
          ? err.detail
          : err.detail?.message || t("api.trapFailed"),
      );
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <ScanLayout
      {...shell}
      title={t("journey.choose.title")}
      badge={isFreeze ? <FreezeBadge /> : <BombBadge />}
      pill={t("journey.choose.pill")}
      score={currentScore}
      remaining={remainingTags}
      actions={
        <Button
          variant="primary"
          loading={submitting}
          disabled={!canSubmit}
          onClick={activate}
        >
          {isFreeze
            ? t("journey.choose.plantFreeze", {
                seconds: canSubmit ? Number(seconds) : "—",
              })
            : t("journey.choose.plantBoom")}
        </Button>
      }
    >
      <TrapPicker
        type={type}
        onTypeChange={setType}
        seconds={seconds}
        onSecondsChange={setSeconds}
        disabled={submitting}
      />

      {error && <InlineMessage type="error" message={error} />}
    </ScanLayout>
  );
}
