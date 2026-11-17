import { Link } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import NfcCoil from "./NfcCoil";
import "./ExperiencePackCard.css";
import { MODE, MODE_LABEL } from "../constants/modes";

/*
One card, two views (Figma: "ADMIN VIEW IN MANAGE MY PACKS" / "USER VIEW IN STORE"):
- variant="admin": status + price, "آخر تعديل", edit link (كمّل for drafts) and ⋯
- variant="store": mode chip, pieces and a full-width "اشترِ · السعر" button (also the live preview on the create page)
Colour comes from the mode: sequential = violet, open = mint.
*/

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

export default function ExperiencePackCard({ variant = "admin", ...props }) {
  return variant === "store" ? <StoreCard {...props} /> : <AdminCard {...props} />;
}

function getTone(mode) {
  return mode === "open" ? "open" : "seq";
}

function getModeName(mode) {
  return MODE_LABEL[mode] ?? MODE_LABEL[MODE.SEQUENTIAL];
}

// المتجر: الطريقة، عدد القطع، وزر «اشترِ · السعر» بعرض البطاقة.
function StoreCard({ mode = "sequential", pieces, price, loading = false, disabled = false, onBuy }) {
  const modeLabel = getModeName(mode);

  return (
    <article
      className={`pack-card pack-card--${getTone(mode)} pack-card--store`}
      aria-label={`${modeLabel} · ${pieces} قطعة`}
      aria-busy={loading}
    >
      <NfcCoil bare line="var(--surface)" className="pack-card__coil" />
      <span className="pack-card__mode">
        <i aria-hidden="true" />
        {modeLabel}
      </span>
      <div className="pack-card__pieces">
        <p className="pack-card__overline">عدد القطع</p>
        <p className="pack-card__number">{pieces}</p>
      </div>
      {/* بدون onBuy (معاينة صفحة الإنشاء) يبقى الزر معطّلًا */}
      <button
        type="button"
        className="pack-card__buy"
        onClick={onBuy}
        disabled={disabled || loading || !onBuy}
      >
        {loading ? (
          "جاري التحويل للدفع..."
        ) : (
          <>
            اشترِ · <Price value={price} />
          </>
        )}
      </button>
    </article>
  );
}

// إدارة التجارب: الحالة والسعر، عدد القطع، آخر تعديل، رابط التعديل و ⋯.
function AdminCard({
  title,
  mode = "sequential",
  pieces,
  price,
  status = "available",
  updatedAt,
  editTo,
}) {
  return (
    <article className={`pack-card pack-card--${getTone(mode)} pack-card--admin`}>
      {/* name is only for screen readers / search — the card shows the pieces instead */}
      {title && <h2 className="pack-card__sr">{title}</h2>}

      <NfcCoil bare line="var(--surface)" className="pack-card__coil" />

      <div className="pack-card__top">
        <span className={`pack-card__status pack-card__status--${status}`}>
          <i aria-hidden="true" />
          {STATUS[status] ?? STATUS.available}
        </span>
        <p className="pack-card__price">
          <Price value={price} />
        </p>
      </div>

      <div className="pack-card__pieces">
        <p className="pack-card__overline">عدد القطع</p>
        <p className="pack-card__number">{pieces}</p>
      </div>

      {updatedAt && (
        <p className="pack-card__edited">آخر تعديل {timeAgo(updatedAt)}</p>
      )}

      <div className="pack-card__bar">
        <span className="pack-card__mode">
          <i aria-hidden="true" />
          {getModeName(mode)}
        </span>

        {/* edit link only when there's a page for it (the backend has no "edit pack" yet) */}
        {editTo && (
          <Link to={editTo} className="pack-card__action">
            {status === "draft" ? "كمّل" : "تعديل"}
            {title && <span className="pack-card__sr"> «{title}»</span>}
          </Link>
        )}

        <button
          type="button"
          className="pack-card__more"
          aria-label={title ? `خيارات «${title}»` : "خيارات"}
        >
          <MoreHorizontal size={18} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
