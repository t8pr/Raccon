import DurationStepper from "../../../../shared/ui/DurationStepper/DurationStepper";
import { BombIcon, SnowflakeIcon } from "../ScanBadges/ScanBadges";
import styles from "./TrapPicker.module.css";
import { useTranslation } from "react-i18next";

const trapOptions = [
  {
    value: "freeze",
    label: "customization.traps.freeze",
    description: "journey.picker.freezeText",
    Icon: SnowflakeIcon,
  },
  {
    value: "boom",
    label: "customization.traps.boom",
    description: "journey.picker.boomText",
    Icon: BombIcon,
  },
];

// اختيار الفخ للاعب أثناء الجولة: النوع، ثم مدة التجميد بالعدّاد نفسه المستخدم عند المالك.
export default function TrapPicker({
  type,
  onTypeChange,
  seconds,
  onSecondsChange,
  disabled = false,
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.picker}>
      <div className={styles.options} role="radiogroup" aria-label={t("journey.picker.label")}>
        {trapOptions.map(({ value, label, description, Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={type === value}
            className={styles.option}
            disabled={disabled}
            onClick={() => onTypeChange(value)}
          >
            <Icon className={styles.icon} />
            <b>{t(label)}</b>
            <small>{t(description)}</small>
          </button>
        ))}
      </div>

      {type === "freeze" && (
        <div className={styles.duration}>
          <span id="trap-picker-duration" className={styles.durationLabel}>
            {t("customization.traps.freezeDuration")}
          </span>
          <DurationStepper
            size="lg"
            value={seconds}
            onChange={onSecondsChange}
            disabled={disabled}
            describedBy="trap-picker-duration"
          />
        </div>
      )}
    </div>
  );
}
