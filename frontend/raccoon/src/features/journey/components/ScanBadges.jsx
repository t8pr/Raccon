import { Check, Flag, Lock, LockOpen } from "lucide-react";
import Mark from "../../../assets/Mark.png";
import snowflake from "../../../assets/journey/snowflake.png";
import styles from "./ScanBadges.module.css";

/*
  محتويات الدائرة في ScanLayout. كل واحدة ترسم ما بداخل الدائرة فقط؛
  مقاس الدائرة وموضعها من ScanLayout.
*/

// رقم القطعة: 7 → "07"
export function NumberBadge({ value }) {
  return (
    <span className={styles.number}>
      {String(value ?? "").padStart(2, "0")}
    </span>
  );
}

export function CheckBadge() {
  return <Check size={56} strokeWidth={2.2} aria-hidden="true" />;
}

// سبقك غيرك
export function FlagBadge() {
  return <Flag className={styles.muted} size={56} aria-hidden="true" />;
}

// مو رابطك
export function LockBadge() {
  return <Lock className={styles.mint} size={58} aria-hidden="true" />;
}

// انفكّ التجميد
export function UnlockBadge() {
  return <LockOpen size={58} aria-hidden="true" />;
}

// استعد / التحميل
export function MarkBadge() {
  return <img className={styles.mark} src={Mark} alt="" />;
}

// القنبلة: مصمتة حتى تظهر على الدائرة الداكنة. value مثل "−1" يظهر داخلها.
export function BombBadge({ value }) {
  return (
    <span className={styles.bomb}>
      <BombIcon />
      {value != null && (
        <span className={styles.bombValue} dir="ltr">
          {value}
        </span>
      )}
    </span>
  );
}

// ندفة الثلج، ومعها الثواني الباقية بخط صغير إن وُجدت
export function FreezeBadge({ seconds }) {
  return (
    <span className={styles.freeze}>
      <img src={snowflake} alt="" width="160" height="177" />
      {seconds != null && (
        <span className={styles.freezeSeconds}>
          <b>{seconds}</b> ثانية
        </span>
      )}
    </span>
  );
}

// خلصتها: كأس وبجانبه عدد القطع المكتملة
export function CupBadge({ count }) {
  return (
    <>
      <svg
        className={styles.cup}
        viewBox="0 0 56 54"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M12 12H7.5C5 12 3.5 13.5 3.5 16c0 5.5 3.8 8.5 9 8.5M44 12h4.5c2.5 0 4 1.5 4 4 0 5.5-3.8 8.5-9 8.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M12 6h32v14c0 10-7 17-16 17s-16-7-16-17Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <rect x="25" y="37" width="6" height="8" fill="currentColor" />
        <rect
          x="15"
          y="44"
          width="26"
          height="7"
          rx="3.5"
          fill="currentColor"
        />
      </svg>
      {count && <span className={styles.count}>{count}</span>}
    </>
  );
}

// أيقونة القنبلة وحدها (تُستخدم أيضًا في TrapPicker)
export function BombIcon({ className = "" }) {
  return (
    <svg
      className={`${styles.bombIcon} ${className}`.trim()}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className={styles.fuse}
        d="M48 12.5c2-4.5 5-.5 7-2.5s1-4 4-5"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect
        x="38"
        y="11"
        width="13"
        height="11"
        rx="2"
        transform="rotate(45 44.5 16.5)"
        fill="currentColor"
      />
      <circle cx="27" cy="37" r="22" fill="currentColor" />
    </svg>
  );
}

// ندفة الثلج وحدها (تُستخدم في TrapPicker)
export function SnowflakeIcon({ className = "" }) {
  return (
    <img
      className={className}
      src={snowflake}
      alt=""
      width="160"
      height="177"
    />
  );
}
