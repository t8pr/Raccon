import { Ban, Snowflake, Bomb, Dices } from "lucide-react";
import DurationStepper from "./DurationStepper/DurationStepper";
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

export default function TrapField({
  value,
  onValueChange,
  freezeSeconds,
  onFreezeSecondsChange,
  disabled = false,
}) {
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

            {/* العدّاد فقط: المالك يختار أي مدة من 1 إلى 180 ثانية */}
            <DurationStepper
              value={freezeSeconds}
              onChange={onFreezeSecondsChange}
              disabled={disabled}
              describedBy="freeze-duration-help"
            />
          </div>
        </div>
      )}
    </fieldset>
  );
}
