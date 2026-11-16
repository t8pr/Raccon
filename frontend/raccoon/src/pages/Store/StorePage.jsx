import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import AppNavbar from "../../components/layout/AppNavbar";
import ExperiencePackCard from "../../components/ui/ExperiencePackCard";
import FilterBar from "../../components/ui/FilterBar";
import SortButton from "../../components/ui/SortButton";
import Button from "../../components/ui/Button";
import { STORE_PACKAGES, checkoutUrl } from "./checkoutLinks";
import "../../styles/StorePage.css";

const filters = [
  { value: "all", label: "الكل" },
  { value: "sequential", label: "تسلسلي" },
  { value: "open", label: "صيد مفتوح" },
];
const sorts = [
  { value: "default", label: "الترتيب الافتراضي" },
  { value: "price-asc", label: "السعر: الأقل أولًا" },
  { value: "price-desc", label: "السعر: الأعلى أولًا" },
];

export default function StorePage() {
  const [mode, setMode] = useState("all");
  const [size, setSize] = useState("all");
  const [sort, setSort] = useState("default");
  const [selected, setSelected] = useState(null);
  const [redirecting, setRedirecting] = useState(null);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const purchaseLock = useRef(false);
  const visible = STORE_PACKAGES.filter(
    (pkg) =>
      (mode === "all" || pkg.mode === mode) &&
      (size === "all" || pkg.pieces === Number(size)),
  ).sort((a, b) =>
    sort === "price-asc"
      ? a.price - b.price
      : sort === "price-desc"
        ? b.price - a.price
        : 0,
  );

  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current.showModal();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [selected]);

  useEffect(() => {
    function reset() {
      purchaseLock.current = false;
      setRedirecting(null);
    }
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  function closeDialog() {
    dialogRef.current?.close();
  }
  function confirm(pkg) {
    if (purchaseLock.current) return;
    setError("");
    if (!checkoutUrl(pkg.purchaseUrl)) {
      setError("رابط الدفع لهذا البكج غير متاح حاليًا. حاول لاحقًا.");
      return;
    }
    openerRef.current = document.activeElement;
    setSelected(pkg);
  }
  function buy() {
    const url = checkoutUrl(selected?.purchaseUrl);
    if (!url || purchaseLock.current) return;
    purchaseLock.current = true;
    setRedirecting(selected.id);
    closeDialog();
    try {
      window.location.assign(url);
    } catch {
      purchaseLock.current = false;
      setRedirecting(null);
      setError("تعذر فتح صفحة الدفع. حاول مرة أخرى.");
    }
  }
  function clearFilters() {
    setMode("all");
    setSize("all");
  }

  return (
    <div className="store-view" dir="rtl">
      <AppNavbar />
      <section className="store-page" aria-labelledby="store-title">
        <h1 id="store-title">المتجر</h1>
        <p className="store-page__intro">اختار التجربة اللي تناسب جمعتكم.</p>
        <FilterBar
          filters={filters}
          value={mode}
          onChange={setMode}
          label="طريقة اللعب"
          sort={
            <div className="store-page__selects">
              <label className="sort-button store-page__size">
                <select
                  aria-label="الحجم والسعر"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                >
                  <option value="all">الحجم والسعر: الكل</option>
                  {STORE_PACKAGES.filter(
                    (pkg) => pkg.mode === "sequential",
                  ).map((pkg) => (
                    <option key={pkg.pieces} value={pkg.pieces}>
                      {pkg.pieces} قطعة · {pkg.price} ر.س
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} aria-hidden="true" />
              </label>
              <SortButton options={sorts} value={sort} onChange={setSort} />
            </div>
          }
        />
        {(mode !== "all" || size !== "all") && (
          <button
            type="button"
            className="store-page__clear"
            onClick={clearFilters}
          >
            امسح الفلاتر
          </button>
        )}
        {error && <p role="alert">{error}</p>}
        <div className="store-page__grid">
          {visible.map((pkg) => (
            <ExperiencePackCard
              key={pkg.id}
              variant="store"
              {...pkg}
              loading={redirecting === pkg.id}
              disabled={Boolean(redirecting)}
              onBuy={() => confirm(pkg)}
            />
          ))}
        </div>
      </section>
      <dialog
        ref={dialogRef}
        className="store-modal store-modal--confirm"
        aria-labelledby="store-modal-title"
        onClose={() => {
          setSelected(null);
          openerRef.current?.focus();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeDialog();
        }}
      >
        <div className="store-modal__body">
          <h2 id="store-modal-title">هل أنت متأكد من إتمام عملية الشراء؟</h2>
          {selected && (
            <p>
              {selected.mode === "sequential" ? "تسلسلي" : "صيد مفتوح"} ·{" "}
              {selected.pieces} قطعة · {selected.price} ر.س
            </p>
          )}
          <div className="store-modal__actions">
            <Button fullWidth onClick={buy}>
              اشترِ
            </Button>
            <Button fullWidth variant="outline" onClick={closeDialog} autoFocus>
              إلغاء
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
