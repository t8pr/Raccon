import { useEffect, useState } from "react";
import { animate, motion, useDragControls, useMotionValue } from "motion/react";
import { avatarImages } from "../../../../shared/constants/avatarImages";
import styles from "./LeaderboardSheet.module.css";
import { useTranslation } from "react-i18next";

/*
  لوحة المتصدرين المباشرة: جزء من صفحة المسح، ثابتة أسفل الشاشة، واللاعب يسحبها.
  مو Dialog: الصفحة تحتها تبقى شغّالة.

  3 محطات (snap):
    closed  الرأس بس (العنوان والمقبض)
    peek    3 صفوف:  أنا الأول  → أنا، 2، 3
                     أنا الثاني → 1، أنا، 3
                     غير كذا    → 1، 2، أنا (حتى لو ترتيبي 30)
    open    تطلع لين تحت الناف بار، 10 صفوف: أول 10، أو أول 9 + أنا لو أنا برا العشرة
  أي خانة ما فيها لاعب تطلع «-».

  motion: السحب، والحركة بين المحطات (spring)، وحركة الصفوف لما يتغيّر الترتيب (layout).
*/

const ROW = 56; // ارتفاع الصف
const HEAD = 64; // رأس اللوحة (المقبض والعنوان)
const TOP = 84; // مفتوحة: تقف تحت الناف بار
const SPRING = { type: "spring", stiffness: 300, damping: 32 };
const FLICK = 500; // سرعة (px/ثانية) نعتبرها سحبة سريعة

// كم يبان من اللوحة في كل محطة (open = كل الطول)
const VISIBLE = { closed: HEAD, peek: HEAD + ROW * 3 };

export default function LeaderboardSheet({
  snap = "peek",
  onSnapChange,
  top = [],
  me = null,
  loading = false,
  error = "",
}) {
  const { t, i18n } = useTranslation();
  const drag = useDragControls(); // السحب يبدأ من الرأس بس، مو من القائمة

  // طول الشاشة: منه نحسب طول اللوحة ومكان كل محطة
  const [viewport, setViewport] = useState(() => window.innerHeight);

  useEffect(() => {
    const onResize = () => setViewport(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const height = viewport - TOP;
  // y لكل محطة: كم ننزّل اللوحة عشان يبان منها الجزء المطلوب
  const snapY = {
    open: 0,
    peek: height - VISIBLE.peek,
    closed: height - VISIBLE.closed,
  };

  // مكان اللوحة الحالي؛ motion يحدّثه وقت السحب، واحنا نحرّكه للمحطة
  const y = useMotionValue(snapY[snap]);
  const targetY = snapY[snap];

  useEffect(() => {
    const controls = animate(y, targetY, SPRING);
    return () => controls.stop();
  }, [y, targetY]);

  // ---------- الصفوف ----------
  const big =
    !me || me.rank <= 10 ? top.slice(0, 10) : [...top.slice(0, 9), me];
  const small = !me || me.rank <= 3 ? top.slice(0, 3) : [top[0], top[1], me];
  const rows = snap === "open" ? big : small;
  // الصغيرة دايمًا 3 خانات: الناقص «-»
  while (snap !== "open" && rows.length < 3) rows.push(undefined);

  let body;

  if (loading) {
    body = <p className={styles.state}>{t("journey.board.loading")}</p>;
  } else if (error) {
    body = (
      <p className={styles.state} role="alert">
        {error}
      </p>
    );
  } else if (top.length === 0) {
    body = <p className={styles.state}>{t("journey.board.empty")}</p>;
  } else {
    body = (
      <ol className={styles.list}>
        {rows.map((player, index) => {
          // خانة فاضية
          if (!player) {
            return (
              <li key={`empty-${index}`} className={styles.row}>
                <span className={styles.rank}>-</span>
                <span className={styles.avatar} aria-hidden="true" />
                <span className={styles.name}>-</span>
                <span className={styles.score}>-</span>
              </li>
            );
          }

          const isMe = player.user_hash === me?.user_hash;

          return (
            // layout: لو الصف تغيّر مكانه (تغيّر الترتيب) يتحرك له بدل ما يقفز
            <motion.li
              key={player.user_hash}
              layout="position"
              transition={SPRING}
              className={isMe ? `${styles.row} ${styles.me}` : styles.row}
              aria-current={isMe ? "true" : undefined}
            >
              <span className={styles.rank}>{player.rank}</span>
              <img
                className={styles.avatar}
                src={avatarImages[player.avatar_id] ?? avatarImages[1]}
                alt=""
              />
              <span className={styles.name}>
                <bdi>{isMe ? t("journey.board.you") : player.name}</bdi>
              </span>
              <span className={styles.score}>
                <b>{player.score}</b> <small>{t("journey.board.points")}</small>
              </span>
            </motion.li>
          );
        })}
      </ol>
    );
  }

  return (
    <motion.section
      className={styles.sheet}
      dir={i18n.dir()}
      style={{
        y,
        top: TOP,
        height,
        "--row": `${ROW}px`,
        "--head": `${HEAD}px`,
      }}
      aria-labelledby="leaderboard-title"
      // السحب: عمودي بس، ما يطلع فوق محطة open ولا تحت closed
      drag="y"
      dragListener={false}
      dragControls={drag}
      dragConstraints={{ top: snapY.open, bottom: snapY.closed }}
      dragElastic={0.05}
      dragMomentum={false}
      onDragEnd={(event, info) => {
        // سحبة سريعة (flick) = محطة وحدة بنفس الاتجاه
        // سحب بطيء = أقرب محطة لمكان ما تركها
        const order = ["open", "peek", "closed"]; // من فوق لتحت
        const index = order.indexOf(snap);
        let next;

        if (Math.abs(info.velocity.y) > FLICK) {
          const step = info.velocity.y < 0 ? -1 : 1;
          next = order[Math.min(order.length - 1, Math.max(0, index + step))];
        } else {
          next = order.reduce((best, name) =>
            Math.abs(snapY[name] - y.get()) < Math.abs(snapY[best] - y.get())
              ? name
              : best,
          );
        }

        if (next === snap) {
          animate(y, snapY[snap], SPRING); // نرجّعها لمكانها
        } else {
          onSnapChange?.(next);
        }
      }}
      // Esc يصغّرها
      onKeyDown={(event) => {
        if (event.key === "Escape" && snap === "open") onSnapChange?.("peek");
      }}
    >
      {/* الرأس: منه يبدأ السحب */}
      <div className={styles.head} onPointerDown={(event) => drag.start(event)}>
        <span className={styles.grip} aria-hidden="true" />
        <h2 id="leaderboard-title" className={styles.title}>
          {t("journey.board.title")}
        </h2>
        <span className={styles.live}>{t("journey.board.live")}</span>
        {/* زر حقيقي للكيبورد وقارئ الشاشة؛ السحب للّمس */}
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={snap === "open"}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onSnapChange?.(snap === "open" ? "peek" : "open")}
        >
          {snap === "open"
            ? t("journey.board.collapse")
            : t("journey.board.expand")}
        </button>
      </div>

      <div className={styles.body} data-open={snap === "open" || undefined}>
        {body}
      </div>
    </motion.section>
  );
}

// كم تاخذ اللوحة من أسفل الصفحة وهي صغيرة؛ ScanLayout يترك هالمسافة فاضية تحت
export const BOARD_PEEK = VISIBLE.peek;
