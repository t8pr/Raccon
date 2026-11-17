import AppNavbar from "../layout/AppNavbar";
import Chip from "../ui/Chip";
import RankBadge from "./RankBadge";
import LeaderboardSheet from "./LeaderboardSheet";
import styles from "./ScanLayout.module.css";

/*
  ScanLayout — الهيكل الوحيد لكل شاشات المسح.
  كل حالة (حصلتها، بووم، تجمّدت...) تمرّر محتواها فقط؛ المواضع والمقاسات ثابتة هنا،
  فيبقى العنوان والدائرة والشريط على نفس الخط مهما تغيّرت الحالة.

  title       عنوان الحالة
  badge       محتوى الدائرة (رقم أو أيقونة من ScanBadges)
  tone        لون الدائرة: "dark" | "mint"
  pill        نص الشريط تحت الدائرة
  score       نقاط اللاعب · remaining القطع الباقية
  statusChip  نص يحلّ محل شارة النقاط (مثل «انتهت الجولة»)
  showStats   false = بلا شارات ولا إكليل (الصف يبقى محجوزًا حتى لا يتحرك العنوان)
  board       بيانات المتصدرين من ScanPage، أو null إذا لا توجد جولة
  actions     أزرار أسفل الشاشة (زر واحد أو زران)
*/
export default function ScanLayout({
  eventTitle = "جولة راكون",
  title,
  badge,
  tone = "dark",
  pill,
  score,
  remaining,
  statusChip,
  showStats = true,
  board = null,
  boardOpen = false,
  onBoardOpenChange,
  children,
  actions,
}) {
  const hasBoard = showStats && Boolean(board);

  return (
    <div className={styles.screen} dir="rtl">
      <AppNavbar title={eventTitle} />

      <main className={styles.main}>
        <div className={styles.chips}>
          {showStats && (
            <>
              {/* .chip عنصر inline-flex، فنضع النص في span واحد حتى لا تختفي المسافات */}
              <Chip tone="mint" size="md">
                <span>
                  {statusChip ?? (
                    <>
                      نقاطك <bdi>{score ?? 0}</bdi>
                    </>
                  )}
                </span>
              </Chip>

              {!statusChip && remaining != null && (
                <Chip tone="soft" size="md">
                  <span>
                    باقي <bdi>{remaining}</bdi> قطع
                  </span>
                </Chip>
              )}
            </>
          )}
        </div>

        {hasBoard && (
          <div className={styles.rank}>
            <RankBadge
              rank={board.rank}
              expanded={boardOpen}
              onClick={() => onBoardOpenChange?.(true)}
            />
          </div>
        )}

        <header className={styles.hero}>
          <h1 className={styles.title}>{title}</h1>
          <div className={`${styles.circle} ${styles[tone] ?? styles.dark}`}>
            {badge}
          </div>
        </header>

        {pill && <p className={styles.pill}>{pill}</p>}

        <div className={styles.content}>{children}</div>
      </main>

      {actions && <footer className={styles.footer}>{actions}</footer>}

      {hasBoard && (
        <LeaderboardSheet
          open={boardOpen}
          onOpenChange={onBoardOpenChange}
          players={board.players}
          loading={board.loading}
          error={board.error}
          myHash={board.myHash}
          rank={board.rank}
          score={score}
          remaining={remaining}
        />
      )}
    </div>
  );
}
