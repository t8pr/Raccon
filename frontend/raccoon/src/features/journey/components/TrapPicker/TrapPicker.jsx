import { RadioGroup } from "radix-ui";
import styles from "./TrapPicker.module.css";
import { useTranslation } from "react-i18next";

const trapOptions = [
  {
    value: "freeze",
    label: "customization.traps.freeze",
    description: "journey.picker.freezeText",
  },
  {
    value: "boom",
    label: "customization.traps.boom",
    description: "journey.picker.boomText",
  },
];

// مدد التجميد الجاهزة (الحد الأقصى 180 من trapRules)
const DURATIONS = [30, 60, 120, 180];

/*
  اختيار الفخ للاعب أثناء الجولة: النوع، ثم مدة التجميد.
  RadioGroup من radix-ui: مجموعة اختيار واحد جاهزة، فيها role="radio"
  والتنقل بالأسهم في الكيبورد بدون ما نكتبه بأنفسنا.
  RadioGroup يرجّع القيمة نص، فنحوّل المدة لرقم بـ Number.
*/
export default function TrapPicker({
  type,
  onTypeChange,
  seconds,
  onSecondsChange,
  disabled = false,
}) {
  const { t, i18n } = useTranslation();
  // radix يفترض اتجاه يسار←يمين؛ نعطيه اتجاه اللغة عشان الترتيب والأسهم
  const dir = i18n.dir();
  return (
    <div className={styles.picker}>
      <RadioGroup.Root
        className={styles.options}
        dir={dir}
        value={type}
        onValueChange={onTypeChange}
        disabled={disabled}
        aria-label={t("journey.picker.label")}
      >
        {trapOptions.map(({ value, label, description }) => (
          <RadioGroup.Item key={value} value={value} className={styles.option}>
            <b>{t(label)}</b>
            <small>{t(description)}</small>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>

      {type === "freeze" && (
        <RadioGroup.Root
          className={styles.durations}
          dir={dir}
          value={String(seconds)}
          onValueChange={(value) => onSecondsChange(Number(value))}
          disabled={disabled}
          aria-label={t("customization.traps.freezeDuration")}
        >
          {DURATIONS.map((value) => (
            <RadioGroup.Item
              key={value}
              value={String(value)}
              className={styles.duration}
            >
              {t("journey.picker.seconds", { seconds: value })}
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
      )}
    </div>
  );
}
