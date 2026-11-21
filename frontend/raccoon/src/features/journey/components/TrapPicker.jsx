import DurationStepper from "../../../shared/ui/DurationStepper/DurationStepper";
import { BombIcon, SnowflakeIcon } from "./ScanBadges";
import styles from "./TrapPicker.module.css";

const trapOptions = [
  {
    value: "freeze",
    label: "تجميد",
    description: "يوقف اللاعب لين ينتهي الوقت",
    Icon: SnowflakeIcon,
  },
  {
    value: "boom",
    label: "بووم",
    description: "يخسر نقطة وحدة",
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
  return (
    <div className={styles.picker}>
      <div className={styles.options} role="radiogroup" aria-label="نوع الفخ">
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
            <b>{label}</b>
            <small>{description}</small>
          </button>
        ))}
      </div>

      {type === "freeze" && (
        <div className={styles.duration}>
          <span id="trap-picker-duration" className={styles.durationLabel}>
            مدة التجميد
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
