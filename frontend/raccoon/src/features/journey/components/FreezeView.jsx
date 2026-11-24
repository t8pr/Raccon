import { useEffect, useState } from "react";
import Button from "../../../shared/ui/Button/Button";
import ScanLayout from "./ScanLayout/ScanLayout";
import InfoCard, { ProgressBar } from "./InfoCard/InfoCard";
import { FreezeBadge, UnlockBadge } from "./ScanBadges/ScanBadges";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
        title={t("journey.freeze.unfrozenTitle")}
        badge={<UnlockBadge />}
        pill={t("journey.freeze.unfrozenPill")}
        score={currentScore}
        remaining={remainingTags}
        actions={<Button onClick={onContinue}>{t("journey.keepSearching")}</Button>}
      >
        <InfoCard
          title={t("journey.freeze.backTitle")}
          text={t("journey.freeze.backText")}
        />
      </ScanLayout>
    );
  }

  return (
    <ScanLayout
      {...shell}
      title={t("journey.freeze.frozenTitle")}
      badge={<FreezeBadge seconds={remaining} />}
      pill={t("journey.freeze.frozenPill")}
      score={currentScore}
      remaining={remainingTags}
      actions={
        <Button variant="accent" disabled>
          {t("journey.freeze.continueIn")} <bdi>{formatClock(remaining)}</bdi>
        </Button>
      }
    >
      <InfoCard
        label={t("journey.freeze.timerLabel")}
        title={t("journey.freeze.timerTitle", { remaining, total })}
        text={t("journey.freeze.timerText")}
      >
        <ProgressBar
          value={Math.max(0, total - remaining)}
          max={total}
          label={t("journey.freeze.progressLabel")}
        />
      </InfoCard>
    </ScanLayout>
  );
}
