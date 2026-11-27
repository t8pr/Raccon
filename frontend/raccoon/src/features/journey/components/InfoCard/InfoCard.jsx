import styles from "./InfoCard.module.css";

/*
  بطاقة معلومات تحت الدائرة. شكلين:
    عادي (label)   عنوان صغير بنفسجي، وتحته سطر   ← استعد، مو رابطك، زرعته...
    stat           عنوان عريض، وتحته سطر رمادي     ← بووم، تجمّدت
  children: محتوى إضافي بين العنوان والسطر.
  aside: عنصر صغير على طرف البطاقة (مثل «−1» في بووم).
*/
export default function InfoCard({
  title,
  text,
  aside,
  children,
  label,
  variant = "label",
}) {
  return (
    <section
      className={`${styles.card} ${variant === "stat" ? styles.stat : ""}`.trim()}
      aria-label={label ?? title}
    >
      <div className={styles.body}>
        {title && <h2 className={styles.title}>{title}</h2>}
        {children}
        {text && <p className={styles.text}>{text}</p>}
      </div>

      {/* بعد النص = على طرف البطاقة الثاني (يسار في العربي) */}
      {aside && (
        <span className={styles.aside} dir="ltr" aria-hidden="true">
          {aside}
        </span>
      )}
    </section>
  );
}

// سطر توضيح بلا بطاقة (مثل «نقاطك ما تغيّرت»)
export function ScanNote({ children }) {
  return <p className={styles.note}>{children}</p>;
}
