import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import laurel from "../../../assets/journey/laurel.png";
import styles from "./LeaderboardSheet.module.css";

// لوحة المتصدرين: تُفتح من الإكليل أو من زر «شوف المتصدرين».
// Radix Dialog يتكفّل بحبس التركيز والإغلاق بـ Esc وبالضغط خارج اللوحة.
export default function LeaderboardSheet({
  open,
  onOpenChange,
  players = [],
  loading = false,
  error = "",
  myHash,
  rank,
  score,
  remaining,
}) {
  let body;

  if (loading) {
    body = <p className={styles.state}>جاري تحميل المتصدرين...</p>;
  } else if (error) {
    body = (
      <p className={styles.state} role="alert">
        {error}
      </p>
    );
  } else if (players.length === 0) {
    body = <p className={styles.state}>لا يوجد مشاركون بعد.</p>;
  } else {
    body = (
      <ol className={styles.list}>
        {players.map((player, index) => {
          const isMe = player.user_hash === myHash;

          return (
            <li
              key={player.user_hash}
              className={isMe ? styles.me : undefined}
              aria-current={isMe ? "true" : undefined}
            >
              <span className={styles.rank}>{index + 1}</span>
              <span className={styles.name}>
                <bdi>{isMe ? "أنت" : player.name}</bdi>
              </span>
              <span className={styles.score}>
                {player.score} <small>نقطة</small>
              </span>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />

        <Dialog.Content
          className={styles.sheet}
          dir="rtl"
          aria-describedby={undefined}
        >
          <div className={styles.handle} aria-hidden="true" />

          <div className={styles.head}>
            <img
              className={styles.icon}
              src={laurel}
              alt=""
              width="240"
              height="189"
            />
            <Dialog.Title className={styles.title}>المتصدرون</Dialog.Title>
            <Dialog.Close className={styles.close} aria-label="إغلاق">
              <X size={22} aria-hidden="true" />
            </Dialog.Close>
          </div>

          <dl className={styles.summary}>
            <div>
              <dt>ترتيبك</dt>
              <dd>{rank ?? "—"}</dd>
            </div>
            <div>
              <dt>نقاطك</dt>
              <dd>{score ?? 0}</dd>
            </div>
            <div>
              <dt>باقي</dt>
              <dd>{remaining ?? "—"}</dd>
            </div>
          </dl>

          <div className={styles.body}>{body}</div>

          <p className={styles.note}>الترتيب يتحدّث مع كل مسحة.</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
