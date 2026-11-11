import { useRef, useState } from "react";
import { setPlayerTrap } from "../../api/journeyApi";

const FREEZE_SECONDS = 60;

export default function ChooseTrap({
  tagHash,
  userHash,
  accessToken,
  tagNumber,
  currentScore,
  remainingTags,
  onActivated,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const inFlight = useRef(false);

  async function activate(trapType) {
    if (inFlight.current) return;

    const value = trapType === "boom" ? 1 : FREEZE_SECONDS;

    inFlight.current = true;
    setSelected(trapType);
    setSubmitting(true);
    setError("");
    try {
      const result = await setPlayerTrap(
        tagHash,
        userHash,
        accessToken,
        trapType,
        value,
      );
      onActivated(result);
    } catch (err) {
      setError(
        typeof err.detail === "string"
          ? err.detail
          : err.detail?.message || "تعذر تفعيل الفخ.",
      );
      setSelected(null);
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const formatted = String(tagNumber ?? "").padStart(2, "0");

  return (
    <div className="scan-status scan-status--trap">
      <div className="scan-status__chips">
        <span className="scan-chip">نقاطك {currentScore ?? 0}</span>
        <span className="scan-chip">باقي {remainingTags ?? 0} قطع</span>
      </div>

      <h2 className="trap-title">اختر الفخ!</h2>

      <div className="trap-hero">
        <img
          src="/choose-trap-hero.svg"
          alt=""
          className="trap-hero__bg"
          aria-hidden="true"
        />
        <span className="trap-hero__number">{formatted}</span>
      </div>

      <img
        src="/choose-trap-dice.svg"
        alt=""
        className="trap-dice"
        aria-hidden="true"
      />

      <div className="trap-actions">
        <button
          type="button"
          className={`trap-action trap-action--boom${
            selected === "boom" ? " is-selected" : ""
          }`}
          onClick={() => activate("boom")}
          disabled={submitting}
        >
          بووم
        </button>
        <button
          type="button"
          className={`trap-action trap-action--freeze${
            selected === "freeze" ? " is-selected" : ""
          }`}
          onClick={() => activate("freeze")}
          disabled={submitting}
        >
          تجميد {FREEZE_SECONDS}ث
        </button>
      </div>

      <div className="trap-pill">
        {submitting
          ? "جاري تفعيل الفخ..."
          : "الفخ يصيب أول واحد يمسحها بعدك"}
      </div>

      {error && (
        <p className="trap-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
