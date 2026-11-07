import { useRef, useState } from "react";
import { setPlayerTrap } from "../../api/journeyApi";

export default function ChooseTrap({ tagHash, userHash, accessToken, onActivated }) {
  const [freezeSeconds, setFreezeSeconds] = useState("60");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  async function activate(trapType) {
    if (inFlight.current) return;

    const value = trapType === "boom" ? 1 : Number(freezeSeconds);
    if (!Number.isInteger(value) || value < 1 || value > 180) {
      setError("مدة التجميد يجب أن تكون من 1 إلى 180 ثانية.");
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setError("");
    try {
      const result = await setPlayerTrap(tagHash, userHash, accessToken, trapType, value);
      onActivated(result);
    } catch (err) {
      setError(
        typeof err.detail === "string"
          ? err.detail
          : err.detail?.message || "تعذر تفعيل الفخ."
      );
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p>اختر وش يصير للي يمسحها بعدك</p>
      <fieldset disabled={submitting}>
        <legend>نوع الفخ</legend>
        <button type="button" onClick={() => activate("boom")}>
          بووم
        </button>
        <label>
          مدة التجميد بالثواني
          <input
            type="number"
            min="1"
            max="180"
            step="1"
            value={freezeSeconds}
            onChange={(event) => setFreezeSeconds(event.target.value)}
          />
        </label>
        <button type="button" onClick={() => activate("freeze")}>
          تجميد
        </button>
      </fieldset>
      {submitting && <p role="status">جاري تفعيل الفخ...</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
