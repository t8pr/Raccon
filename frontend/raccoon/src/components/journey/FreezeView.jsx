import { useEffect, useState } from "react";
import Button from "../ui/Button";
import ScanLayout from "./ScanLayout";
import InfoCard, { ProgressBar } from "./InfoCard";
import { FreezeBadge, UnlockBadge } from "./ScanBadges";

function secondsUntil(endTime) {
  return Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
}

function formatClock(total) {
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

// فخ التجميد: عدّاد حي، وعند انتهائه تتحول الشاشة إلى «انفكّ التجميد!».
// frozenUntil (وقت الانتهاء من الخادم) له الأولوية، وإلا نحسب من freezeSeconds.
export default function FreezeView({
  shell,
  currentScore,
  remainingTags,
  frozenUntil,
  freezeSeconds,
  onContinue,
}) {
  const [endTime] = useState(() => {
    if (frozenUntil) return new Date(frozenUntil).getTime();
    if (typeof freezeSeconds === "number") {
      return Date.now() + freezeSeconds * 1000;
    }
    return Date.now();
  });

  const [remaining, setRemaining] = useState(() => secondsUntil(endTime));

  // المدة الكاملة للشريط: من الخادم إن عُرفت، وإلا ما بقي لحظة فتح الشاشة
  const [total] = useState(() =>
    typeof freezeSeconds === "number" && freezeSeconds > 0
      ? freezeSeconds
      : secondsUntil(endTime),
  );

  useEffect(() => {
    const tick = () => setRemaining(secondsUntil(endTime));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  if (remaining <= 0) {
    return (
      <ScanLayout
        {...shell}
        title="انفكّ التجميد!"
        badge={<UnlockBadge />}
        pill="تقدر تمسح الحين"
        score={currentScore}
        remaining={remainingTags}
        actions={<Button onClick={onContinue}>كمّل البحث</Button>}
      >
        <InfoCard title="رجعت للعب!" text="أي قطعة تمسحها من الحين تنحسب لك." />
      </ScanLayout>
    );
  }

  return (
    <ScanLayout
      {...shell}
      title="تجمّدت!"
      badge={<FreezeBadge seconds={remaining} />}
      pill="ما تقدر تمسح لين يخلص العدّاد"
      score={currentScore}
      remaining={remainingTags}
      actions={
        <Button variant="accent" disabled>
          كمّل اللعب بعد <bdi>{formatClock(remaining)}</bdi>
        </Button>
      }
    >
      <InfoCard
        label="العدّاد"
        title={`باقي ${remaining} ثانية من ${total}`}
        text="أي قطعة تمسحها الحين ما تنحسب، ارجع لها بعد العدّاد."
      >
        <ProgressBar
          value={Math.max(0, total - remaining)}
          max={total}
          label="الوقت المنقضي من التجميد"
        />
      </InfoCard>
    </ScanLayout>
  );
}
