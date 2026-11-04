import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

import AppNavbar from "../../components/layout/AppNavbar";
import PackageCard from "../../components/ui/PackageCard";
import ExperiencePackCard from "../../components/ui/ExperiencePackCard";
import FilterBar from "../../components/ui/FilterBar";
import SortButton from "../../components/ui/SortButton";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";

import Mark from "../../assets/Mark.png";
import { useAuth } from "../../context/AuthContext";
import { claimHashSchema } from "../../utils/validation";

import {
  addLocalPurchase,
  localPurchasesKey,
} from "../../utils/localPurchases";

import { packages } from "./packages";
import { getCustomProducts } from "../../api/store/storeApi";
import { PACK_SIZES, piecesLabel } from "../Admin/Experiences/packSizes";
import "../../styles/StorePage.css";

/*
Store (Figma: C. المتجر).
Two kinds, one shown at a time (tabs):
- "ready"  = جاهزة للعب  → static list in ./packages.js, card = PackageCard (+ details dialog)
- "custom" = اصنع تجربتك → from getCustomProducts() (backend later), card = ExperiencePackCard
Filters: mode · size & price (one filter, prices are fixed) · sort.
*/

const KINDS = {
  ready: {
    label: "جاهزة للعب",
    title: "جاهزة للعب",
    text: "تجارب كاملة بألغازها وقطعها. تفتح الصندوق وتبدأ اللعب على طول.",
  },
  custom: {
    label: "اصنع تجربتك",
    title: "اصنع تجربتك",
    text: "اختار عدد القطع وطريقة اللعب، وبعد الشراء تكتب ألغازك وتوزّع القطع بنفسك.",
  },
};

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

// الحفظ المحلي مخصص للتجربة الحالية.
const IS_TEST_MODE = process.env.NODE_ENV === "development";

function getModeLabel(mode) {
  return mode === "sequential" ? "تسلسلي" : "صيد مفتوح";
}

export default function StorePage() {
  const auth = useAuth();

  // تغيير الحساب يعيد ضبط حالة النوافذ.
  return <StoreContent key={auth.user?.id ?? "guest"} auth={auth} />;
}

function StoreContent({ auth }) {
  const { user, accessToken, isRestoring, restoreError } = auth;

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [kind, setKind] = useState("ready");
  const [mode, setMode] = useState("all");
  const [size, setSize] = useState("all");
  const [sort, setSort] = useState("popular");
  const [selectedPackage, setSelectedPackage] = useState(null);

  const [step, setStep] = useState("details");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const dialogRef = useRef(null);
  const headingRef = useRef(null);
  const openerRef = useRef(null);
  const purchaseLockRef = useRef(false);

  const signedIn = Boolean(
    user?.id && accessToken && !isRestoring && !restoreError,
  );

  const claimResult = claimHashSchema.safeParse(selectedPackage?.claimHash);

  const canPurchase = IS_TEST_MODE
    ? claimResult.success
    : Boolean(selectedPackage?.purchaseUrl);

  const purchaseMutation = useMutation({
    mutationFn: async ({ userId, product }) => {
      return addLocalPurchase(userId, product);
    },

    retry: false,

    onSuccess: (purchases, variables) => {
      queryClient.setQueryData(localPurchasesKey(variables.userId), purchases);
    },
  });

  // "اصنع تجربتك" products (later from the backend)
  const customQuery = useQuery({
    queryKey: ["store-custom-products"],
    queryFn: ({ signal }) => getCustomProducts({ signal }),
    staleTime: 5 * 60_000,
  });
  const customProducts = customQuery.data ?? [];

  const source = kind === "ready" ? packages : customProducts;

  const visiblePackages = source.filter((pkg) => {
    return (
      (mode === "all" || pkg.mode === mode) &&
      (size === "all" || pkg.pieces === Number(size))
    );
  });

  const filtersOn = mode !== "all" || size !== "all";

  function clearFilters() {
    setMode("all");
    setSize("all");
  }

  visiblePackages.sort((a, b) => {
    if (sort === "price-asc") {
      return a.price - b.price;
    }

    if (sort === "price-desc") {
      return b.price - a.price;
    }

    // custom products have no popularity → keep them small → big
    return (b.popularity ?? 0) - (a.popularity ?? 0) || a.pieces - b.pieces;
  });

  // منع تمرير خلفية الصفحة أثناء فتح النافذة.
  useEffect(() => {
    if (!isDialogOpen) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDialogOpen]);

  // نقل التركيز لعنوان النافذة الحالية.
  useEffect(() => {
    if (isDialogOpen) {
      headingRef.current?.focus();
    }
  }, [isDialogOpen, step]);

  function openDetails(id) {
    const pkg = [...packages, ...customProducts].find((item) => item.id === id);

    if (!pkg) return;

    openerRef.current = document.activeElement;

    purchaseMutation.reset();
    setSelectedPackage(pkg);
    setStep("details");
    setIsDialogOpen(true);

    dialogRef.current.showModal();
  }

  function closeDialog() {
    if (purchaseLockRef.current) return;

    dialogRef.current?.close();
  }

  function handleDialogClose() {
    setIsDialogOpen(false);
    setStep("details");

    openerRef.current?.focus();
  }

  function openPurchaseConfirmation() {
    if (!selectedPackage || !canPurchase) return;

    purchaseMutation.reset();
    setStep("confirm");
  }

  async function handlePurchase() {
    if (
      !selectedPackage ||
      step !== "confirm" ||
      purchaseLockRef.current ||
      !canPurchase
    ) {
      return;
    }

    // لاحقًا: فتح رابط رمز الحقيقي عند توفره.
    if (!IS_TEST_MODE) {
      if (selectedPackage.purchaseUrl) {
        window.open(
          selectedPackage.purchaseUrl,
          "_blank",
          "noopener,noreferrer",
        );
      }

      return;
    }

    if (!signedIn) return;

    purchaseLockRef.current = true;
    setStep("loading");

    try {
      await purchaseMutation.mutateAsync({
        userId: user.id,
        product: selectedPackage,
      });

      // النجاح يظهر فقط بعد نجاح الحفظ.
      setStep("success");
    } catch {
      // الخطأ يظهر في نافذة التأكيد.
      setStep("confirm");
    } finally {
      purchaseLockRef.current = false;
    }
  }

  function openMyPackages() {
    closeDialog();
    navigate("/packages");
  }

  const isCustom = selectedPackage?.kind === "custom";

  let dialogTitle = isCustom
    ? `اصنع تجربتك · ${piecesLabel(selectedPackage.pieces)}`
    : selectedPackage?.title;

  if (step === "confirm") {
    dialogTitle = "تأكيد الطلب";
  } else if (step === "loading") {
    dialogTitle = "جارٍ تجهيز طلبك";
  } else if (step === "success") {
    dialogTitle = "تمت عملية الشراء";
  }

  return (
    <div className="store-view" dir="rtl">
      <AppNavbar />

      <section className="store-page" aria-labelledby="store-title">
        <h1 id="store-title">المتجر</h1>

        <p className="store-page__intro">اختار التجربة اللي تناسب جمعتكم.</p>

        {/* tabs: one kind at a time */}
        <div className="store-tabs" role="tablist" aria-label="نوع التجربة">
          {Object.entries(KINDS).map(([key, item]) => {
            const count = key === "ready" ? packages.length : customProducts.length;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={kind === key}
                className="store-tabs__tab"
                onClick={() => setKind(key)}
              >
                {item.label}
                <span className="store-tabs__count">{count}</span>
              </button>
            );
          })}
        </div>

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
                  onChange={(event) => setSize(event.target.value)}
                >
                  <option value="all">الحجم والسعر: الكل</option>
                  {PACK_SIZES.map((item) => (
                    <option key={item.pieces} value={item.pieces}>
                      {piecesLabel(item.pieces)} · {item.price} ر.س
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} aria-hidden="true" />
              </label>
              <SortButton options={sorts} value={sort} onChange={setSort} />
            </div>
          }
        />

        <div className="store-page__results">
          <p role="status">
            عرض {visiblePackages.length} من {source.length}
          </p>
          {filtersOn && (
            <button type="button" className="store-page__clear" onClick={clearFilters}>
              امسح الفلاتر
            </button>
          )}
        </div>

        <header className="store-page__section">
          <h2>{KINDS[kind].title}</h2>
          <p>{KINDS[kind].text}</p>
        </header>

        {visiblePackages.length ? (
          <div className="store-page__grid">
            {kind === "ready"
              ? visiblePackages.map((pkg) => (
                  <PackageCard key={pkg.id} pkg={pkg} onDetails={openDetails} />
                ))
              : visiblePackages.map((item) => (
                  <ExperiencePackCard
                    key={item.id}
                    variant="store"
                    mode={item.mode}
                    pieces={item.pieces}
                    price={item.price}
                    onBuy={() => openDetails(item.id)}
                  />
                ))}
          </div>
        ) : (
          <div className="store-page__empty" role="status">
            <p>ما فيه تجارب بهالفلاتر.</p>
            <Button variant="outline" onClick={clearFilters}>
              امسح الفلاتر
            </Button>
          </div>
        )}
      </section>

      <dialog
        ref={dialogRef}
        className={`store-modal store-modal--${step}`}
        aria-labelledby="store-modal-title"
        onClose={handleDialogClose}
        onCancel={(event) => {
          if (purchaseLockRef.current) {
            event.preventDefault();
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeDialog();
          }
        }}
      >
        {selectedPackage && (
          <div className="store-modal__surface">
            <Button
              variant="outline"
              className="store-modal__close"
              disabled={purchaseMutation.isPending}
              onClick={closeDialog}
              aria-label="إغلاق النافذة"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </Button>

            {step !== "loading" && (
              <div className="store-modal__cover" aria-hidden="true">
                {/* التفاصيل: لون موحد وشعار فقط. */}
                {step !== "details" && (
                  <div className="package-card__art">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                )}

                <span
                  className="store-modal__mark"
                  style={{
                    maskImage: `url(${Mark})`,
                    WebkitMaskImage: `url(${Mark})`,
                  }}
                />
              </div>
            )}

            <div className="store-modal__body">
              {step === "loading" && (
                <span className="store-modal__spinner" aria-hidden="true" />
              )}

              <h2 id="store-modal-title" ref={headingRef} tabIndex={-1}>
                {dialogTitle}
              </h2>

              {/* تفاصيل الحزمة */}
              {step === "details" && (
                <>
                  <p className="store-modal__intro">
                    {isCustom
                      ? `${getModeLabel(selectedPackage.mode)} · ${selectedPackage.price} ر.س — تستلم ${piecesLabel(selectedPackage.pieces)} NFC فاضية، وتكتب ألغازك وتوزّعها بنفسك.`
                      : selectedPackage.introduction ?? selectedPackage.description}
                  </p>

                  {selectedPackage.suitableFor?.length > 0 && (
                    <section>
                      <h3>يناسب</h3>

                      <div className="store-modal__chips">
                        {selectedPackage.suitableFor.map((text) => (
                          <Chip key={text} tone="soft">
                            {text}
                          </Chip>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className="store-modal__how">
                    <h3>كيف يشتغل؟</h3>

                    <p>
                      وزّع القطع في المكان، امسح واجمع النقاط، وشاهد المنافسة
                      تشتعل على لوحة الصدارة.
                    </p>
                  </section>

                  <hr className="store-modal__divider" />

                  {isCustom && (
                    <p className="store-modal__note" role="status">
                      شراء «اصنع تجربتك» يفتح قريبًا.
                    </p>
                  )}

                  <Button
                    fullWidth
                    disabled={!canPurchase}
                    onClick={openPurchaseConfirmation}
                  >
                    اشترِ التجربة
                  </Button>
                </>
              )}

              {/* تأكيد الطلب */}
              {step === "confirm" && (
                <>
                  <dl className="store-modal__summary">
                    <div>
                      <dt>التجربة</dt>
                      <dd>{selectedPackage.title}</dd>
                    </div>

                    <div>
                      <dt>الطور</dt>
                      <dd>{getModeLabel(selectedPackage.mode)}</dd>
                    </div>

                    <div>
                      <dt>السعر</dt>
                      <dd>{selectedPackage.price} ر.س</dd>
                    </div>
                  </dl>

                  {IS_TEST_MODE && !signedIn && (
                    <>
                      <p className="store-modal__note" role="status">
                        {isRestoring
                          ? "جارٍ التحقق من الحساب..."
                          : restoreError ||
                            "سجّل دخولك أولًا حتى نحفظ التجربة في حسابك."}
                      </p>

                      {!isRestoring && (
                        <Button
                          variant="outline"
                          fullWidth
                          onClick={() => {
                            closeDialog();
                            navigate("/login");
                          }}
                        >
                          تسجيل الدخول
                        </Button>
                      )}
                    </>
                  )}

                  {purchaseMutation.isError && (
                    <p className="store-modal__note" role="alert">
                      {purchaseMutation.error?.message ||
                        "تعذر حفظ التجربة. حاول مرة أخرى."}
                    </p>
                  )}

                  <div className="store-modal__actions">
                    <Button
                      fullWidth
                      disabled={
                        purchaseMutation.isPending ||
                        (IS_TEST_MODE && !signedIn)
                      }
                      onClick={handlePurchase}
                    >
                      تأكيد الشراء
                    </Button>

                    <Button
                      fullWidth
                      variant="outline"
                      onClick={() => {
                        purchaseMutation.reset();
                        setStep("details");
                      }}
                    >
                      رجوع للتفاصيل
                    </Button>
                  </div>
                </>
              )}

              {/* حالة الحفظ */}
              {step === "loading" && (
                <p role="status" className="store-modal__intro">
                  جارٍ إضافة التجربة إلى حسابك.
                </p>
              )}

              {/* نجاح العملية */}
              {step === "success" && (
                <>
                  <p className="store-modal__intro">
                    شكرًا لك، تجربتك صارت جاهزة للاستلام.
                  </p>

                  <div className="store-modal__actions">
                    <Button fullWidth onClick={openMyPackages}>
                      انتقل إلى تجاربي
                    </Button>

                    <Button fullWidth variant="outline" onClick={closeDialog}>
                      رجوع للمتجر
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
