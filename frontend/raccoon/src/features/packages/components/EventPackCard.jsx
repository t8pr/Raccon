import { getModeLabel } from "../../../shared/constants/modes";

// بطاقة جولة: الاسم والطريقة، عدد القطع، وزر «تخصيص».
export default function EventPackCard({ pkg, onOpen }) {
  const tone = pkg.mode === "open" ? "open" : "seq";

  return (
    <article
      className={`event-pack event-pack--${tone}`}
      aria-labelledby={`package-title-${pkg.id}`}
    >
      <div className="event-pack__heading">
        <h2 id={`package-title-${pkg.id}`}>
          <bdi>{pkg.name}</bdi>
        </h2>
        <span className="event-pack__mode">
          <i aria-hidden="true" />
          {getModeLabel(pkg.mode)}
        </span>
      </div>

      <div className="event-pack__pieces">
        <p className="event-pack__label">عدد القطع</p>
        <p className="event-pack__number">{pkg.pieces ?? "—"}</p>
      </div>

      <button
        type="button"
        className="event-pack__customize"
        onClick={() => onOpen(pkg)}
        aria-label={`تخصيص ${pkg.name}`}
      >
        تخصيص
      </button>
    </article>
  );
}
