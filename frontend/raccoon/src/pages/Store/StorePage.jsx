import { useRef, useState } from "react";
import AppNavbar from "../../components/layout/AppNavbar";
import PackageCard from "../../components/ui/PackageCard";
import FilterBar from "../../components/ui/FilterBar";
import SortButton from "../../components/ui/SortButton";
import Button from "../../components/ui/Button";
import { packages } from "./packages";
import Chip from "../../components/ui/Chip";
import Mark from "../../assets/Mark.png";

/*
Store Page have 4 responsialbes 
1-store the filter and order the current by use the useState 
2-Select the sutable package by use filter 
3-the right result order bu sort (from top to down or down to top)
4-dispaly the card for every result by use map 
*/

const filters = [
  { value: "all", label: "الكل" },
  { value: "sequential", label: "تسلسلي" },
  { value: "open", label: "صيد مفتوح" },
];
const sorts = [
  { value: "popular", label: "الأكثر طلبًا" },
  { value: "price-asc", label: "السعر: الأقل أولًا" },
  { value: "price-desc", label: "السعر: الأعلى أولًا" },
];

export default function StorePage() {
  const [mode, setMode] = useState("all");
  const [sort, setSort] = useState("popular");
  const [selectedPackage, setSelectedPackage] = useState(null);

  const dialogRef = useRef(null);

  // filter يرجع مصفوفة جديدة.
  const visiblePackages = packages.filter((pkg) => {
    return mode === "all" || pkg.mode === mode;
  });

  // نرتب المصفوفة الجديدة، فلا نغيّر البيانات الأصلية.
  visiblePackages.sort((a, b) => {
    if (sort === "price-asc") {
      return a.price - b.price;
    }

    if (sort === "price-desc") {
      return b.price - a.price;
    }

    return b.popularity - a.popularity;
  });

  function openDetails(id) {
    const pkg = packages.find((item) => item.id === id);

    if (!pkg) return;

    setSelectedPackage(pkg);
    dialogRef.current.showModal();
  }

  function closeDetails() {
    dialogRef.current.close();
  }

  return (
    <div className="store-view" dir="rtl">
      <AppNavbar />

      <section className="store-page" aria-labelledby="store-title">
        <h1 id="store-title">المتجر</h1>

        <p className="store-page__intro">
          اختار الباكج اللي يناسب جمعتكم — الشراء يكتمل في سلة.
        </p>

        <FilterBar
          filters={filters}
          value={mode}
          onChange={setMode}
          sort={<SortButton options={sorts} value={sort} onChange={setSort} />}
        />

        <div className="store-page__grid">
          {visiblePackages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} onDetails={openDetails} />
          ))}
        </div>
      </section>

      <dialog
        ref={dialogRef}
        className="store-details"
        aria-labelledby="details-title"
      >
        {selectedPackage && (
          <div className="store-details__content">
            <Button
              variant="ghost"
              className="store-details__close"
              onClick={closeDetails}
              aria-label="إغلاق التفاصيل"
            >
              ×
            </Button>

            <div
              className={`package-card__cover store-details__cover package-card__cover--${
                selectedPackage.coverTone || "mint"
              }`}
            >
              {selectedPackage.cover ? (
                <img
                  className="package-card__image"
                  src={selectedPackage.cover}
                  alt=""
                />
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
            </div>

            <div className="store-details__badges">
              <Chip
                tone={selectedPackage.mode === "sequential" ? "accent" : "dark"}
              >
                {selectedPackage.mode === "sequential" ? "تسلسلي" : "صيد مفتوح"}
              </Chip>

              <Chip tone="neutral">
                {selectedPackage.meta.split("·")[0].trim()}
              </Chip>
            </div>

            <h2 id="details-title" className="store-details__title">
              {selectedPackage.title}
            </h2>

            <p className="store-details__description">
              {selectedPackage.description}
            </p>

            <p className="store-details__price">
              {selectedPackage.price} <span aria-label="ريال سعودي">ر.س</span>
            </p>

            {selectedPackage.contents?.length > 0 && (
              <section className="store-details__box">
                <h3>وش في الصندوق</h3>

                <ul>
                  {selectedPackage.contents.map((item) => (
                    <li key={item}>
                      <span aria-hidden="true">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="store-details__purchase">
              <Button
                variant="secondary"
                fullWidth
                disabled={!selectedPackage.guideUrl}
                onClick={() => {
                  if (selectedPackage.guideUrl) {
                    window.open(
                      selectedPackage.guideUrl,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }
                }}
              >
                ▸ شوف كيف يشتغل الطور{" "}
                {selectedPackage.mode === "sequential"
                  ? "التسلسلي"
                  : "الصيد المفتوح"}
              </Button>

              <Button
                variant="primary"
                fullWidth
                disabled={!selectedPackage.purchaseUrl}
                onClick={() => {
                  if (selectedPackage.purchaseUrl) {
                    window.open(
                      selectedPackage.purchaseUrl,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }
                }}
              >
                اشترِ من خلال رمز ↗
              </Button>

              <p>
                بتنتقل لمتجر رمز لإكمال الدفع، وبعدها يوصلك رابط التفعيل على
                إيميلك.
              </p>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
