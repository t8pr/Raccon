import { Link } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import NfcCoil from "./NfcCoil";
import "../../styles/ExperiencePackCard.css";

/*
One card, two views (Figma: "ADMIN VIEW IN MANAGE MY PACKS" / "USER VIEW IN STORE"):
- variant="admin": status + price, "آخر تعديل", edit link (كمّل for drafts) and ⋯
- variant="store": full-width price bar and "شراء" (used as the live preview on the create page)
Colour comes from the mode: sequential = violet, open = mint.
*/

const MODE_LABEL = { sequential: "تسلسلي", open: "صيد مفتوح" };

const STATUS = {
  available: "متاحة", // owner_id = null → nobody claimed it yet
  sold: "مُباعة", // owner_id set → a customer claimed it
  published: "منشورة",
  draft: "مسودة",
  archived: "مؤرشفة",
};

function timeAgo(iso) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days === 2) return "قبل يومين";
  if (days < 7) return `قبل ${days} أيام`;
  if (days < 14) return "قبل أسبوع";
  if (days < 30) return `قبل ${Math.round(days / 7)} أسابيع`;
  return days < 60 ? "قبل شهر" : `قبل ${Math.round(days / 30)} أشهر`;
}

function Price({ value }) {
  return value ? (
    <>
      {value} <span aria-label="ريال سعودي">ر.س</span>
    </>
  ) : (
    "بدون سعر"
  );
}

export default function ExperiencePackCard({
  variant = "admin",
  title,
  mode = "sequential",
  pieces,
  price,
  status = "available",
  updatedAt,
  editTo,
  onBuy, // store: makes "شراء" a real button
}) {
  const isStore = variant === "store";
  const tone = mode === "open" ? "open" : "seq";
  const modeLabel = MODE_LABEL[mode] ?? MODE_LABEL.sequential;

  return (
    <article className={`pack-card pack-card--${tone} pack-card--${variant}`}>
      {/* name is only for screen readers / search — the card shows the pieces instead */}
      {title && <h2 className="pack-card__sr">{title}</h2>}

      <NfcCoil bare line="var(--surface)" className="pack-card__coil" />

      <div className="pack-card__top">
        {!isStore && (
          <span className={`pack-card__status pack-card__status--${status}`}>
            <i aria-hidden="true" />
            {STATUS[status] ?? STATUS.available}
          </span>
        )}
        <p className="pack-card__price">
          <Price value={price} />
        </p>
      </div>

      <div className="pack-card__pieces">
        <p className="pack-card__overline">عدد القطع</p>
        <p className="pack-card__number">{pieces}</p>
      </div>

      {!isStore && updatedAt && (
        <p className="pack-card__edited">آخر تعديل {timeAgo(updatedAt)}</p>
      )}

      <div className="pack-card__bar">
        <span className="pack-card__mode">
          <i aria-hidden="true" />
          {modeLabel}
        </span>

        {isStore &&
          (onBuy ? (
            <button type="button" className="pack-card__action" onClick={onBuy}>
              شراء
              <span className="pack-card__sr"> تجربة {pieces} قطعة</span>
            </button>
          ) : (
            <span className="pack-card__action">شراء</span>
          ))}
        {/* edit link only when there's a page for it (the backend has no "edit pack" yet) */}
        {!isStore && editTo && (
          <Link to={editTo} className="pack-card__action">
            {status === "draft" ? "كمّل" : "تعديل"}
            {title && <span className="pack-card__sr"> «{title}»</span>}
          </Link>
        )}

        {/* ⋯ = admin actions only; hidden on the real store */}
        {!onBuy && (
        <button
          type="button"
          className="pack-card__more"
          aria-label={title ? `خيارات «${title}»` : "خيارات"}
          disabled={isStore}
        >
          <MoreHorizontal size={18} aria-hidden="true" />
        </button>
        )}
      </div>
    </article>
  );
}
