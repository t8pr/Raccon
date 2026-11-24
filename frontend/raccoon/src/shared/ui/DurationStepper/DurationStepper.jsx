import { useId } from "react";
import { Minus, Plus } from "lucide-react";
import {
  FREEZE_MIN_SECONDS,
  FREEZE_MAX_SECONDS,
  clampFreezeSeconds,
  isValidFreezeSeconds,
} from "../../utils/trapRules";
import styles from "./DurationStepper.module.css";
import { useTranslation } from "react-i18next";

// عدّاد مدة التجميد: يختار المستخدم أي عدد ثوانٍ يبيه بالزرين أو بالكتابة.
// مستخدم في مكانين: TrapField (المالك) و TrapPicker (اللاعب).
// value قد تكون رقمًا أو نصًا أثناء الكتابة، والأب هو من يحتفظ بها.
export default function DurationStepper({
  value,
  onChange,
  disabled = false,
  size = "md", // "md" لصفحة التخصيص · "lg" لشاشة اللاعب على الجوال
  describedBy,
}) {
  const { t } = useTranslation();
  const errorId = useId();
  const valid = isValidFreezeSeconds(value);
  const seconds = Number(value);

  function step(amount) {
    const current = valid ? seconds : FREEZE_MIN_SECONDS;
    onChange(clampFreezeSeconds(current + amount));
  }

  const describedByIds = [describedBy, valid ? null : errorId]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`${styles.root} ${styles[size]}`}>
      <div className={styles.row}>
        {/* dir="ltr" حتى يبقى الناقص يسار والزائد يمين مثل أي عدّاد أرقام */}
        <div className={styles.stepper} dir="ltr">
          <button
            type="button"
            className={styles.button}
            aria-label={t("common.freeze.decrease")}
            disabled={disabled || (valid && seconds <= FREEZE_MIN_SECONDS)}
            onClick={() => step(-1)}
          >
            <Minus size={18} aria-hidden="true" />
          </button>

          <input
            className={styles.input}
            type="number"
            inputMode="numeric"
            min={FREEZE_MIN_SECONDS}
            max={FREEZE_MAX_SECONDS}
            step="1"
            value={value ?? ""}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            aria-label={t("common.freeze.inputLabel")}
            aria-invalid={!valid}
            aria-describedby={describedByIds || undefined}
          />

          <button
            type="button"
            className={styles.button}
            aria-label={t("common.freeze.increase")}
            disabled={disabled || (valid && seconds >= FREEZE_MAX_SECONDS)}
            onClick={() => step(1)}
          >
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>

        <span className={styles.unit}>{t("common.freeze.unit")}</span>
      </div>

      {!valid && (
        <p id={errorId} role="alert" className={styles.error}>
          {t("common.freeze.rangeError", {
            min: FREEZE_MIN_SECONDS,
            max: FREEZE_MAX_SECONDS,
          })}
        </p>
      )}
    </div>
  );
}
