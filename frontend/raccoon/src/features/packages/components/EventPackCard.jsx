import { getModeLabel } from "../../../shared/constants/modes";
import { getPackageTone, UNTITLED } from "../packageItems";
import { useTranslation } from "react-i18next";

// بطاقة جولة: الاسم والطريقة، عدد القطع، وزر «تخصيص».
export default function EventPackCard({ pkg, onOpen }) {
  const { t } = useTranslation();
  const tone = getPackageTone(pkg.mode);
  const name = pkg.name === UNTITLED ? t("packages.untitled") : pkg.name;

  return (
    <article
      className={`event-pack event-pack--${tone}`}
      aria-labelledby={`package-title-${pkg.id}`}
    >
      <div className="event-pack__heading">
        <h2 id={`package-title-${pkg.id}`}>
          <bdi>{name}</bdi>
        </h2>
        <span className="event-pack__mode">
          <i aria-hidden="true" />
          {getModeLabel(pkg.mode)}
        </span>
      </div>

      <div className="event-pack__pieces">
        <p className="event-pack__label">{t("common.piecesCount")}</p>
        <p className="event-pack__number">{pkg.pieces ?? "—"}</p>
      </div>

      <button
        type="button"
        className="event-pack__customize"
        onClick={() => onOpen(pkg)}
        aria-label={t("packages.customizeNamed", { name })}
      >
        {t("packages.customize")}
      </button>
    </article>
  );
}
