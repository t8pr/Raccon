import { useRef, useState } from "react";
import { setPlayerTrap } from "../../api/journeyApi";
import {
  FREEZE_DEFAULT_SECONDS,
  isValidFreezeSeconds,
} from "../../utils/trapRules";
import Button from "../ui/Button";
import InlineMessage from "../ui/InlineMessage";
import ScanLayout from "./ScanLayout";
import TrapPicker from "./TrapPicker";
import { BombBadge, FreezeBadge } from "./ScanBadges";

// قطعة فخ من نوع «اختر»: اللاعب يحدد النوع ومدة التجميد ثم يزرع الفخ.
// shell: الخصائص المشتركة لـ ScanLayout (اسم الجولة، المتصدرون) تأتي من ScanPage.
export default function ChooseTrap({
  shell,
  tagHash,
  userHash,
  accessToken,
  currentScore,
  remainingTags,
  onActivated,
}) {
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
      const result = await setPlayerTrap(
        tagHash,
        userHash,
        accessToken,
        type,
        value,
      );
      onActivated(result);
    } catch (err) {
      setError(
        typeof err.detail === "string"
          ? err.detail
          : err.detail?.message || "تعذر تفعيل الفخ.",
      );
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <ScanLayout
      {...shell}
      title="اختر الفخ!"
      badge={isFreeze ? <FreezeBadge /> : <BombBadge />}
      pill="الفخ يصيب أول واحد يمسحها بعدك"
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
            ? `ازرع فخ التجميد · ${canSubmit ? Number(seconds) : "—"} ث`
            : "ازرع فخ بووم"}
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
