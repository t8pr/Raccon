import { useRef, useState } from "react";
import { setPlayerTrap } from "../api";
import { FREEZE_DEFAULT_SECONDS } from "../../../shared/utils/trapRules";
import Button from "../../../shared/ui/Button/Button";
import InlineMessage from "../../../shared/ui/InlineMessage/InlineMessage";
import ScanLayout from "./ScanLayout/ScanLayout";
import TrapPicker from "./TrapPicker/TrapPicker";
import { DiceBadge, TRAP_ORBIT } from "./ScanBadges/ScanBadges";
import { useTranslation } from "react-i18next";

// قطعة فخ من نوع «اختر»: اللاعب يحدد النوع ومدة التجميد ثم يزرع الفخ.
// shell: الخصائص المشتركة لـ ScanLayout · stats: { score, remaining, total } لنقاط التقدّم
export default function ChooseTrap({
  shell,
  stats,
  tagHash,
  userHash,
  onActivated,
}) {
  const { t } = useTranslation();
  const [type, setType] = useState("freeze");
  const [seconds, setSeconds] = useState(FREEZE_DEFAULT_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  const isFreeze = type === "freeze";

  async function activate() {
    if (inFlight.current) return;

    // بووم قيمته ثابتة 1، والتجميد بعدد الثواني المختار
    const value = isFreeze ? seconds : 1;

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
      mode="open"
      {...stats}
      title={t("journey.choose.title")}
      badge={<DiceBadge />}
      orbit={TRAP_ORBIT}
      actions={
        <Button variant="outline" loading={submitting} onClick={activate}>
          {isFreeze
            ? t("journey.choose.plantFreeze", { seconds })
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
