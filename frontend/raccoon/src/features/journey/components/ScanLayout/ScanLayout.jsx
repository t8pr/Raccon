import AppNavbar from "../../../../shared/layout/AppNavbar/AppNavbar";
import LeaderboardSheet, {
  BOARD_PEEK,
} from "../LeaderboardSheet/LeaderboardSheet";
import styles from "./ScanLayout.module.css";
import { useTranslation } from "react-i18next";

// شكل النجمة (4 رؤوس) بمقاس 1؛ نكبّرها ونحرّكها بـ transform
const SPARKLE =
  "M0 -1C.12 -.12 .12 -.12 1 0C.12 .12 .12 .12 0 1C-.12 .12 -.12 .12 -1 0C-.12 -.12 -.12 -.12 0 -1Z";

/*
  ScanLayout — الهيكل الوحيد لكل شاشات المسح.
  كل حالة (حصلتها، بووم، تجمّدت...) تمرّر محتواها فقط؛ المواضع والمقاسات ثابتة هنا.

  title       عنوان الحالة (ستيكر: حرف أبيض بحد داكن وظل بنفسجي)
  titleSize   مقاس خط العنوان بالبكسل من التصميم (الافتراضي 68.88؛ العناوين الطويلة أصغر)
  badge       محتوى الدائرة (رقم أو أيقونة من ScanBadges)
  orbit       3 أيقونات صغيرة حول الدائرة (شاشات الفخ)
  mode        نمط الجولة: "seq" (تسلسلي) = خلفية بنفسجية، غيره = خضراء
  score       نقاط اللاعب · remaining القطع الباقية · total كل القطع (إن أرسلها الخادم)
              منها نرسم نقاط التقدّم تحت الدائرة
  showStats   false = بلا نقاط تقدّم ولا متصدرين (قبل الجولة، أو رابط لاعب ثاني)
  board       المتصدرون من ScanPage ({ top, me, loading, error, snap, onSnapChange })، أو null إذا لا توجد جولة
  actions     زر أسفل الشاشة (اختر الفخ بس)
*/
export default function ScanLayout({
  eventTitle,
  title,
  titleSize = 68.88,
  badge,
  orbit,
  mode,
  score,
  remaining,
  total,
  showStats = true,
  board = null,
  children,
  actions,
}) {
  const { t } = useTranslation();
  const hasBoard = showStats && Boolean(board);

  // التقدّم: كل القطع، وكم منها خلص. لو الخادم ما أرسل المجموع نقدّره بالنقاط + الباقي
  const allTags = total ?? (score ?? 0) + (remaining ?? 0);
  const done = allTags - (remaining ?? 0);
  const showProgress = showStats && remaining != null && allTags > 0;

  return (
    <div
      className={`${styles.screen} ${mode === "seq" ? styles.seq : styles.open} ${orbit ? styles.withOrbit : ""}`}
      // اللوحة ثابتة تحت؛ نترك مكانها فاضي عشان ما تغطي آخر المحتوى ولا الزر
      style={{ "--board-space": hasBoard ? `${BOARD_PEEK}px` : "0px" }}
    >
      <AppNavbar title={eventTitle ?? t("journey.defaultTitle")} />

      <main className={styles.main}>
        <header className={styles.hero}>
          {/* المقاس يروح للـ CSS كمتغيّر، والـ CSS يصغّره بنفس النسبة في الشاشات القصيرة */}
          <h1
            className={styles.title}
            style={{ "--sc-title-size": `${titleSize}px` }}
          >
            {title}
          </h1>

          <div className={styles.circle}>
            {/* الخلفية خلف الدائرة: التوهج من CSS، والدوائر المتقطعة والنجوم هنا.
                زخرفة بس، فقارئ الشاشة يتجاهلها (aria-hidden) */}
            <svg
              className={styles.aura}
              viewBox="0 0 360 360"
              aria-hidden="true"
              focusable="false"
            >
              <circle className={styles.auraRing} cx="180" cy="180" r="127" />
              <circle className={styles.auraRing} cx="180" cy="180" r="149" />
              <circle className={styles.auraRing} cx="180" cy="180" r="171" />
              <path
                className={styles.sparkleA}
                d={SPARKLE}
                transform="translate(60 95) scale(18)"
              />
              <path
                className={styles.sparkleB}
                d={SPARKLE}
                transform="translate(300 70) scale(22)"
              />
              <path
                className={styles.sparkleB}
                d={SPARKLE}
                transform="translate(75 275) scale(10)"
              />
              <path
                className={styles.sparkleA}
                d={SPARKLE}
                transform="translate(290 285) scale(14)"
              />
            </svg>

            {badge}

            {/* أيقونات حول الدائرة: فوق يمين، فوق يسار، تحت */}
            {orbit?.map((icon, index) => (
              <span
                key={index}
                className={`${styles.orbit} ${styles[`orbit${index}`]}`}
                aria-hidden="true"
              >
                {icon}
              </span>
            ))}
          </div>

          {/* نقاط التقدّم: الممتلئة = القطع اللي خلصت.
              الصف موجود دايمًا (فاضي لو ما فيه تقدّم) عشان البطاقة تبدأ من نفس الخط في كل الصفحات */}
          {showProgress ? (
            <div
              className={styles.dots}
              role="img"
              aria-label={t("journey.progressLabel", { done, total: allTags })}
            >
              {Array.from({ length: allTags }, (_, index) => (
                <span
                  key={index}
                  className={index < done ? styles.dotDone : styles.dot}
                />
              ))}
            </div>
          ) : (
            <div className={styles.dots} aria-hidden="true" />
          )}
        </header>

        <div className={styles.content}>{children}</div>
      </main>

      {actions && <footer className={styles.footer}>{actions}</footer>}

      {hasBoard && (
        <LeaderboardSheet
          snap={board.snap}
          onSnapChange={board.onSnapChange}
          top={board.top}
          me={board.me}
          loading={board.loading}
          error={board.error}
        />
      )}
    </div>
  );
}
