import { useEffect, useState } from "react";
import ScanLayout from "./ScanLayout/ScanLayout";
import InfoCard from "./InfoCard/InfoCard";
import { FreezeBadge, UnlockBadge } from "./ScanBadges/ScanBadges";
import { useTranslation } from "react-i18next";

function secondsUntil(endTime) {
  return Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
}
// frozenUntil (وقت الانتهاء من الخادم) له الأولوية، وإلا نحسب من freezeSeconds.
// stats: { score, remaining, total } لنقاط التقدّم
export default function FreezeView({
  shell,
  stats,
  frozenUntil,
  freezeSeconds,
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
        mode="open"
        {...stats}
        title={t("journey.freeze.unfrozenTitle")}
        titleSize={47.59}
        badge={<UnlockBadge />}
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
      mode="open"
      {...stats}
      title={t("journey.freeze.frozenTitle")}
      badge={<FreezeBadge seconds={remaining} />}
    >
      {/* العدّاد في الدائرة، فالبطاقة فيها النص بس */}
      <InfoCard
        variant="stat"
        label={t("journey.freeze.timerLabel")}
        text={t("journey.freeze.timerText")}
      />
    </ScanLayout>
  );
}
