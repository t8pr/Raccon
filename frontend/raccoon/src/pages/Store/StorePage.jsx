import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import AppNavbar from "../../components/layout/AppNavbar";
import PackageCard from "../../components/ui/PackageCard";
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

  const [mode, setMode] = useState("all");
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

  const visiblePackages = packages.filter((pkg) => {
    return mode === "all" || pkg.mode === mode;
  });

  visiblePackages.sort((a, b) => {
    if (sort === "price-asc") {
      return a.price - b.price;
    }

    if (sort === "price-desc") {
      return b.price - a.price;
    }

    return b.popularity - a.popularity;
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
    const pkg = packages.find((item) => item.id === id);

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

  let dialogTitle = selectedPackage?.title;

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

        <p className="store-page__intro">اختار الحزمة اللي تناسب جمعتكم.</p>

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
                    {selectedPackage.introduction ??
                      selectedPackage.description}
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

                  <Button
                    fullWidth
                    disabled={!canPurchase}
                    onClick={openPurchaseConfirmation}
                  >
                    اشترِ الحزمة
                  </Button>
                </>
              )}

              {/* تأكيد الطلب */}
              {step === "confirm" && (
                <>
                  <dl className="store-modal__summary">
                    <div>
                      <dt>الحزمة</dt>
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
                            "سجّل دخولك أولًا حتى نحفظ الحزمة في باقات حسابك."}
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
                        "تعذر حفظ الحزمة. حاول مرة أخرى."}
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
                  جارٍ إضافة الحزمة إلى باقاتك.
                </p>
              )}

              {/* نجاح العملية */}
              {step === "success" && (
                <>
                  <p className="store-modal__intro">
                    شكرًا لك، حزمتك صارت جاهزة للاستلام.
                  </p>

                  <div className="store-modal__actions">
                    <Button fullWidth onClick={openMyPackages}>
                      انتقل إلى باقاتي
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
