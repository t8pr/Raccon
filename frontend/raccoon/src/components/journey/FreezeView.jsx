import { useEffect, useState } from "react";

function computeRemaining({ frozenUntil, freezeSeconds }) {
  if (frozenUntil) {
    const end = new Date(frozenUntil).getTime();
    return Math.max(0, Math.ceil((end - Date.now()) / 1000));
  }
  if (typeof freezeSeconds === "number") return Math.max(0, freezeSeconds);
  return 0;
}

function formatMMSS(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function FreezeView({
  tagNumber,
  currentScore,
  remainingTags,
  frozenUntil,
  freezeSeconds,
}) {
  const [endTime] = useState(() => {
    if (frozenUntil) return new Date(frozenUntil).getTime();
    if (typeof freezeSeconds === "number") {
      return Date.now() + freezeSeconds * 1000;
    }
    return Date.now();
  });

  const [remaining, setRemaining] = useState(() =>
    computeRemaining({ frozenUntil: new Date(endTime).toISOString() }),
  );

  useEffect(() => {
    const tick = () => {
      const r = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setRemaining(r);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  const formatted = String(tagNumber ?? "").padStart(2, "0");

  return (
    <div className="scan-status scan-status--freeze">
      <div className="scan-status__chips">
        <span className="scan-chip">نقاطك {currentScore ?? 0}</span>
        <span className="scan-chip">باقي {remainingTags ?? 0} قطع</span>
      </div>

      <h2 className="freeze-title">تجمّدت!</h2>

      <div className="freeze-hero">
        <img
          src="/freeze-hero.svg"
          alt=""
          className="freeze-hero__bg"
          aria-hidden="true"
        />
        <span className="freeze-hero__number">{formatted}</span>
        <span className="freeze-hero__timer">{formatMMSS(remaining)}</span>
      </div>

      <img
        src="/freeze-character.svg"
        alt=""
        className="freeze-character"
        aria-hidden="true"
      />

      <div className="freeze-pill">
        {remaining > 0
          ? "ما تقدر تمسح لين يخلص العدّاد"
          : "خلص التجميد! تقدر تمسح الحين"}
      </div>
    </div>
  );
}
