import { useEffect, useRef, useState } from "react";
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
  { value: "default", label: "الحجم والسعر" },
  { value: "price-asc", label: "السعر: الأقل أولًا" },
  { value: "price-desc", label: "السعر: الأعلى أولًا" },
];

export default function StorePage() {
  const [mode, setMode] = useState("all");
  const [sort, setSort] = useState("default");
  const [selected, setSelected] = useState(null);
  const [redirecting, setRedirecting] = useState(null);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const purchaseLock = useRef(false);
  const visible = STORE_PACKAGES.filter(
    (pkg) => mode === "all" || pkg.mode === mode,
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
  return (
    <div className="store-view" dir="rtl">
      <AppNavbar />
      <section className="store-page" aria-labelledby="store-title">
        <h1 id="store-title">المتجر</h1>
        <FilterBar
          filters={filters}
          value={mode}
          onChange={setMode}
          label="طريقة اللعب"
          sort={<SortButton options={sorts} value={sort} onChange={setSort} />}
        />
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
