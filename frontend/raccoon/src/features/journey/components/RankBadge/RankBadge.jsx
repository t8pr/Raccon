import laurel from "../../../../assets/journey/laurel.png";
import styles from "./RankBadge.module.css";
import { useTranslation } from "react-i18next";

// إكليل الترتيب: رقم ترتيب اللاعب داخله، والضغط يفتح لوحة المتصدرين.
export default function RankBadge({
  rank,
  expanded = false,
  onClick,
  className = "",
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={`${styles.badge} ${className}`.trim()}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-label={
        rank
          ? t("journey.board.rankLabel", { rank })
          : t("journey.board.title")
      }
      onClick={onClick}
    >
      <img src={laurel} alt="" width="240" height="189" />
      {rank != null && <span className={styles.number}>{rank}</span>}
    </button>
  );
}
