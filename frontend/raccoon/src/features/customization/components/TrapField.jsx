import { Ban, Snowflake, Bomb, Dices } from "lucide-react";
import DurationStepper from "../../../shared/ui/DurationStepper/DurationStepper";
import { useTranslation } from "react-i18next";
const trapOptions = [
  {
    value: "none",
    label: "customization.traps.none",
    description: "customization.traps.noneText",
    Icon: Ban,
  },
  {
    value: "freeze",
    label: "customization.traps.freeze",
    description: "customization.traps.freezeText",
    Icon: Snowflake,
  },
  {
    value: "boom",
    label: "customization.traps.boom",
    description: "customization.traps.boomText",
    Icon: Bomb,
  },
  {
    value: "choose",
    label: "customization.traps.choose",
    description: "customization.traps.chooseText",
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
  const { t } = useTranslation();
  return (
    <fieldset className="trap-field" disabled={disabled}>
      <legend>
        {t("customization.traps.title")} <span>{t("customization.traps.hint")}</span>
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

                  <strong>{t(option.label)}</strong>
                </span>

                <small>{t(option.description)}</small>
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
                {t("customization.traps.freezeDuration")}
              </h3>
              <p id="freeze-duration-help">
                {t("customization.traps.freezeHelp")}
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
