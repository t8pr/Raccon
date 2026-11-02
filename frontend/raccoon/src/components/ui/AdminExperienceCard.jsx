import { Link } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import Chip from "./Chip";
import Mark from "../../assets/Mark.png";

// Same look as the store's PackageCard, with admin status + actions.
const statusChip = {
  published: { label: "منشورة", tone: "mint" },
  draft: { label: "مسودة", tone: "warning" },
  archived: { label: "مؤرشفة", tone: "neutral" },
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

export default function AdminExperienceCard({ experience }) {
  const { id, title, description, pieces, duration, players, mode, price, status, coverTone, updatedAt } =
    experience;
  const isSequential = mode === "sequential";
  const chip = statusChip[status] ?? statusChip.draft;
  const meta = [`${pieces} قطعة`, duration, players].filter(Boolean).join(" · ");

  return (
    <article className="package-card admin-exp-card">
      <div className={`package-card__cover package-card__cover--${coverTone || "mint"}`}>
        <div className="package-card__art" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <span style={{ maskImage: `url(${Mark})`, WebkitMaskImage: `url(${Mark})` }} />
        </div>

        <div className="package-card__mode">
          <Chip tone={isSequential ? "accent" : "dark"}>{isSequential ? "تسلسلي" : "صيد مفتوح"}</Chip>
        </div>
        <div className="admin-exp-card__status">
          <Chip tone={chip.tone}>{chip.label}</Chip>
        </div>
      </div>

      <div className="package-card__body">
        <h2>{title}</h2>
        {description && <p className="package-card__description">{description}</p>}
        <p className="package-card__meta">{meta}</p>

        <div className="package-card__footer">
          <div className="admin-exp-card__price">
            <strong className="package-card__price">
              {price ? (
                <>
                  {price} <span aria-label="ريال سعودي">ر.س</span>
                </>
              ) : (
                "بدون سعر"
              )}
            </strong>
            <small>آخر تعديل {timeAgo(updatedAt)}</small>
          </div>

          <div className="admin-exp-card__actions">
            <Link to={`/admin/experiences/${id}/edit`} className="ui-button ui-button--outline admin-exp-card__edit">
              {status === "draft" ? "كمّل" : "تعديل"}
            </Link>
            <button type="button" className="admin-exp-card__more" aria-label={`خيارات «${title}»`}>
              <MoreHorizontal size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
