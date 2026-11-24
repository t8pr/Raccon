import styles from "./InfoCard.module.css";

// بطاقة معلومات عامة تحت الشريط: عنوان، سطر توضيح، ومحتوى اختياري بينهما (مثل شريط العدّاد).
// aside: عنصر صغير على طرف البطاقة (مثل «−1» في بووم).
export default function InfoCard({ title, text, aside, children, label }) {
  return (
    <section className={styles.card} aria-label={label ?? title}>
      <div className={styles.body}>
        <h2 className={styles.title}>{title}</h2>
        {children}
        {text && <p className={styles.text}>{text}</p>}
      </div>

      {aside && (
        <span className={styles.aside} dir="ltr" aria-hidden="true">
          {aside}
        </span>
      )}
    </section>
  );
}

// سطر توضيح بلا بطاقة (مثل «نقاطك ما تغيّرت»). strong: سطر أول بخط عريض.
export function ScanNote({ strong, children }) {
  return (
    <p className={`${styles.note} ${strong ? styles.noteLarge : ""}`.trim()}>
      {strong && <strong>{strong}</strong>}
      {children}
    </p>
  );
}

// شريط تقدّم العدّاد
export function ProgressBar({ value, max, label }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      className={styles.progress}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <i style={{ width: `${percent}%` }} />
    </div>
  );
}
