import {
  Bomb,
  Check,
  Dice5,
  Flag,
  Lock,
  LockOpen,
  Snowflake,
  Trophy,
} from "lucide-react";
import Mark from "../../../../assets/Mark.png";
import styles from "./ScanBadges.module.css";
import { useTranslation } from "react-i18next";

/*
  محتويات الدائرة في ScanLayout. كل واحدة ترسم ما بداخل الدائرة فقط؛
  مقاس الدائرة وموضعها ولونها من ScanLayout.
  الأيقونات من lucide-react (موجودة في المشروع)، وكلها بلون النص (currentColor).
*/

const ICON = { size: 52, strokeWidth: 1.8, "aria-hidden": true };

// رقم القطعة: 7 → "07"
export function NumberBadge({ value }) {
  return (
    <span className={styles.number}>
      {String(value ?? "").padStart(2, "0")}
    </span>
  );
}

// حقتك من قبل
export function CheckBadge() {
  return <Check {...ICON} />;
}

// سبقك غيرك
export function FlagBadge() {
  return <Flag {...ICON} />;
}

// مو رابطك
export function LockBadge() {
  return <Lock {...ICON} />;
}

// انفكّ التجميد
export function UnlockBadge() {
  return <LockOpen {...ICON} />;
}

// الأيقونات الثلاث حول النرد في «اختر الفخ!» و«زرعته!» (ScanLayout يرسمها حول الدائرة)
export const TRAP_ORBIT = [
  <Snowflake key="freeze" />,
  <Bomb key="boom" />,
  <Flag key="flag" />,
];

// اختر الفخ / زرعته
export function DiceBadge() {
  return <Dice5 {...ICON} />;
}

// استعد / التحميل
export function MarkBadge() {
  // الشعار ملفه بلون نعناعي فيختفي على الدائرة؛ نستخدمه كقناع (mask) ونلوّنه بلون الحبر
  return (
    <span
      className={styles.mark}
      style={{ "--mark": `url(${Mark})` }}
      aria-hidden="true"
    />
  );
}

// ما عرفناها
export function QuestionBadge() {
  return <span className={styles.question}>؟</span>;
}

// بووم: كم نقطة راحت، مثل "−1"
export function BoomBadge({ value }) {
  return (
    <span className={styles.number} dir="ltr">
      {value}
    </span>
  );
}

// تجمّدت: الثواني الباقية، وتحتها «ثانية»
export function FreezeBadge({ seconds }) {
  const { t } = useTranslation();
  return (
    <span className={styles.freeze}>
      <b>{seconds}</b>
      <small>{t("common.freeze.unit")}</small>
    </span>
  );
}

// خلصت: كأس، وعلى طرف الدائرة نجمة فيها عدد القطع (12/12) إن عرفناه
export function TrophyBadge({ count }) {
  return (
    <>
      <Trophy {...ICON} />
      {count && (
        <span className={styles.burst} dir="ltr">
          {count}
        </span>
      )}
    </>
  );
}
