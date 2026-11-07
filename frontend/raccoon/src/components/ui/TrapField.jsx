import { Ban, Snowflake, Bomb, Dices, Info } from "lucide-react";
const trapOptions = [
  { value: "none", label: "بدون فخ", description: "قطعة عادية", Icon: Ban },
  {
    value: "freeze",
    label: "تجميد",
    description: "يوقف اللاعب عن المسح لمدة",
    Icon: Snowflake,
  },
  { value: "boom", label: "بووم", description: "يخصم نقطة واحدة", Icon: Bomb },
  {
    value: "choose",
    label: "اختار فخ",
    description: "اللاعب يختار تجميد أو بوم",
    Icon: Dices,
  },
];

const durations = [60, 90, 120, 150, 180];

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = String(seconds % 60).padStart(2, "0");

  return `${minutes}:${remaining}`;
}
export default function TrapField({
  value,
  onValueChange,
  freezeSeconds,
  onFreezeSecondsChange,
  disabled = false,
}) {
  const duration = Number(freezeSeconds);

  const validDuration =
    String(freezeSeconds).trim() !== "" &&
    Number.isInteger(duration) &&
    duration >= 1 &&
    duration <= 180;

  const showFreeze = value === "freeze" || value === "choose";
  const showBoom = value === "boom" || value === "choose";

  return (
    <fieldset className="trap-field" disabled={disabled}>
      <legend>
        الفخ <span>اختياري · فخ واحد لكل قطعة</span>
      </legend>

      <div className="trap-field__options">
        {trapOptions.map((option) => {
          const Icon = option.Icon;

          return (
            <label className="trap-field__option" key={option.value}>
              <input
                type="radio"
                name="tag-trap"
                value={option.value}
                checked={value === option.value}
                onChange={() => onValueChange(option.value)}
              />

              <span className="trap-field__option-card">
                <span className="trap-field__option-heading">
                  <span className="trap-field__icon">
                    <Icon size={16} aria-hidden="true" />
                  </span>

                  <strong>{option.label}</strong>
                </span>

                <small>{option.description}</small>
              </span>
            </label>
          );
        })}
      </div>

      {value !== "none" && (
        <div className="trap-field__details">
          {value === "choose" && (
            <p className="trap-field__notice">
              <Info size={16} aria-hidden="true" />
              اللاعب يختار تجميد أو بوم أثناء اللعب.
            </p>
          )}

          <div
            className={`trap-field__details-grid ${
              value === "choose" ? "trap-field__details-grid--two" : ""
            }`}
          >
            {showBoom && (
              <div className="trap-field__panel">
                <h3>
                  <Bomb size={16} aria-hidden="true" />
                  بووم
                </h3>

                <strong>−1 نقطة</strong>

                <p>يخسر اللاعب نقطة واحدة.</p>
              </div>
            )}

            {showFreeze && (
              <div className="trap-field__panel">
                <h3>
                  <Snowflake size={16} aria-hidden="true" />
                  مدة التجميد
                </h3>

                <div className="trap-field__times">
                  {durations.map((seconds) => (
                    <button
                      key={seconds}
                      type="button"
                      className="trap-field__time"
                      aria-pressed={duration === seconds}
                      onClick={() => onFreezeSecondsChange(seconds)}
                    >
                      {formatDuration(seconds)}
                    </button>
                  ))}

                  <label className="trap-field__custom-time">
                    <span>ثانية</span>

                    <input
                      type="number"
                      min="1"
                      max="180"
                      step="1"
                      value={freezeSeconds ?? ""}
                      onChange={(event) =>
                        onFreezeSecondsChange(event.target.value)
                      }
                      aria-label="مدة التجميد بالثواني"
                      aria-invalid={!validDuration}
                      aria-describedby="freeze-duration-help"
                    />
                  </label>
                </div>

                <p id="freeze-duration-help">
                  {validDuration
                    ? "اللاعب اللي يمسح القطعة ما يقدر يمسح أي قطعة ثانية لين يخلص الوقت."
                    : "أدخل عددًا صحيحًا من 1 إلى 180 ثانية."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
}
