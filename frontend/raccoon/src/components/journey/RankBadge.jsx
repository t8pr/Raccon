import laurel from "../../assets/journey/laurel.png";
import styles from "./RankBadge.module.css";

// إكليل الترتيب: رقم ترتيب اللاعب داخله، والضغط يفتح لوحة المتصدرين.
export default function RankBadge({
  rank,
  expanded = false,
  onClick,
  className = "",
}) {
  return (
    <button
      type="button"
      className={`${styles.badge} ${className}`.trim()}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-label={rank ? `المتصدرون — ترتيبك ${rank}` : "المتصدرون"}
      onClick={onClick}
    >
      <img src={laurel} alt="" width="240" height="189" />
      {rank != null && <span className={styles.number}>{rank}</span>}
    </button>
  );
}
