import Chip from "./Chip";
import Button from "./Button";
import Mark from "../../assets/Mark.png";

export default function PackageCard({ pkg, onDetails }) {
  const modeLabel = pkg.mode === "sequential" ? "تسلسلي" : "صيد مفتوح";

  const modeTone = pkg.mode === "sequential" ? "accent" : "dark";

  const [, duration, players] = pkg.meta.split("·");

  return (
    <article className="package-card">
      <div
        className={`package-card__cover package-card__cover--${
          pkg.coverTone || "mint"
        }`}
      >
        {pkg.cover ? (
          <img className="package-card__image" src={pkg.cover} alt="" />
        ) : (
          <div className="package-card__art" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />

            <span
              style={{
                maskImage: `url(${Mark})`,
                WebkitMaskImage: `url(${Mark})`,
              }}
            />
          </div>
        )}

        <div className="package-card__mode">
          <Chip tone={modeTone}>{modeLabel}</Chip>
        </div>
      </div>

      <div className="package-card__body">
        <h2>{pkg.title}</h2>

        <p className="package-card__description">{pkg.description}</p>

        <dl className="store-card-facts">
          <div>
            <dt>عدد القطع</dt>
            <dd>{pkg.pieces} قطعة NFC</dd>
          </div>

          <div>
            <dt>مدة الجولة</dt>
            <dd>
              <bdi>{duration?.trim()}</bdi>
            </dd>
          </div>

          <div>
            <dt>عدد اللاعبين</dt>
            <dd>
              <bdi>{players?.trim()}</bdi>
            </dd>
          </div>
        </dl>

        <div className="package-card__footer">
          <strong className="package-card__price">
            {pkg.price} <span aria-label="ريال سعودي">ر.س</span>
          </strong>

          <Button variant="outline" onClick={() => onDetails(pkg.id)}>
            التفاصيل
          </Button>
        </div>
      </div>
    </article>
  );
}
