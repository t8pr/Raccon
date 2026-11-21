import { Link } from "react-router-dom";
import NfcCoil from "./NfcCoil";
import "./ExperiencePackCard.css";
import { MODE, MODE_LABEL } from "../constants/modes";

/*
One card, two views (Figma: "ADMIN VIEW IN MANAGE MY PACKS" / "USER VIEW IN STORE"):
- variant="admin": same card as the store, with a full-width «تعديل» bar (كمّل for drafts)
- variant="store": mode chip, pieces and a full-width "شراء · السعر" button (also the live preview on the create page)
Colour comes from the mode: sequential = violet, open = mint.
*/

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

// المتجر: الطريقة، عدد القطع، وزر «شراء · السعر» بعرض البطاقة.
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
            شراء · <Price value={price} />
          </>
        )}
      </button>
    </article>
  );
}

// إدارة التجارب (Figma "Admin · experiences list"): نفس بطاقة المتجر، والشريط «تعديل».
// ما فيه صفحة تعديل في الباك إند للحين، فبدون editTo يظهر الزر معطّل مع «قريبًا».
function AdminCard({ title, mode = "sequential", pieces, status = "available", editTo }) {
  const modeLabel = getModeName(mode);

  return (
    <article
      className={`pack-card pack-card--${getTone(mode)} pack-card--store pack-card--admin`}
      aria-label={`${modeLabel} · ${pieces} قطعة`}
    >
      {/* name is only for screen readers / search — the card shows the pieces instead */}
      {title && <h2 className="pack-card__sr">{title}</h2>}
      <NfcCoil bare line="var(--surface)" className="pack-card__coil" />
      <span className="pack-card__mode">
        <i aria-hidden="true" />
        {modeLabel}
      </span>
      <div className="pack-card__pieces">
        <p className="pack-card__overline">عدد القطع</p>
        <p className="pack-card__number">{pieces}</p>
      </div>
      {editTo ? (
        <Link to={editTo} className="pack-card__buy">
          {status === "draft" ? "كمّل" : "تعديل"}
          {title && <span className="pack-card__sr"> «{title}»</span>}
        </Link>
      ) : (
        <button type="button" className="pack-card__buy" disabled title="التعديل قريبًا">
          تعديل
          <span className="pack-card__sr"> (قريبًا)</span>
        </button>
      )}
    </article>
  );
}
