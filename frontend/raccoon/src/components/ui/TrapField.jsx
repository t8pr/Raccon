import {
  Ban,
  Snowflake,
  Bomb,
  Dices,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
    description: " أختار تجميد أو بووم أثناء الجولة",
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

  function stepDuration(amount) {
    const current = validDuration ? duration : 1;
    onFreezeSecondsChange(Math.min(180, Math.max(1, current + amount)));
  }

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

      {value === "freeze" && (
        <div className="trap-field__details">
          <div className="trap-field__panel">
            <div className="trap-field__duration-heading">
              <h3>
                <Snowflake size={16} aria-hidden="true" />
                مدة التجميد
              </h3>
              <p id="freeze-duration-help">
                اللاعب اللي يمسح القطعة ما يقدر يمسح أي قطعة ثانية لين يخلص
                الوقت.
              </p>
            </div>

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

              <div className="trap-field__duration-control">
                <div className="trap-field__stepper" dir="ltr">
                  <button
                    type="button"
                    aria-label="تقليل مدة التجميد ثانية واحدة"
                    disabled={disabled || (validDuration && duration <= 1)}
                    onClick={() => stepDuration(-1)}
                  >
                    <ChevronDown size={20} aria-hidden="true" />
                  </button>
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
                    aria-describedby={`freeze-duration-help${validDuration ? "" : " freeze-duration-error"}`}
                  />
                  <button
                    type="button"
                    aria-label="زيادة مدة التجميد ثانية واحدة"
                    disabled={disabled || (validDuration && duration >= 180)}
                    onClick={() => stepDuration(1)}
                  >
                    <ChevronUp size={20} aria-hidden="true" />
                  </button>
                </div>
                <span className="trap-field__duration-unit">ثانية</span>
              </div>
            </div>
            {!validDuration && (
              <p
                id="freeze-duration-error"
                role="alert"
                className="trap-field__duration-error"
              >
                أدخل عددًا صحيحًا من 1 إلى 180 ثانية.
              </p>
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
}
