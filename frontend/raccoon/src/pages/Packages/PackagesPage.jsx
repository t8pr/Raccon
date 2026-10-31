import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, X } from "lucide-react";

import AppNavbar from "../../components/layout/AppNavbar";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";
import FilterBar from "../../components/ui/FilterBar";

import Mark from "../../assets/Mark.png";

import { useAuth } from "../../context/AuthContext";
import { previewPack } from "../../api/packs/packsApi";
import { getMyEvents } from "../../api/events/eventsApi";

import {
  readLocalPurchases,
  renameLocalPurchase,
  localPurchasesKey,
  purchasesStorageKey,
} from "../../utils/localPurchases";

const statuses = {
  pending: {
    label: "بانتظار الربط",
    tone: "neutral",
  },
  checking: {
    label: "جارٍ التحقق",
    tone: "neutral",
  },
  unavailable: {
    label: "تعذر التحقق",
    tone: "neutral",
  },
  linked: {
    label: "مرتبطة بحسابك",
    tone: "mint",
  },
  other: {
    label: "مرتبطة بحساب آخر",
    tone: "error",
  },
  draft: {
    label: "ما تجهزت",
    tone: "neutral",
  },
  paused: {
    label: "متوقفة",
    tone: "neutral",
  },
  live: {
    label: "شغّالة",
    tone: "neutral",
  },
};

function getModeLabel(mode) {
  if (mode === "sequential" || mode === "seq") {
    return "تسلسلي";
  }

  if (mode === "open") {
    return "صيد مفتوح";
  }

  return "غير محدد";
}

export default function PackagesPage() {
  const auth = useAuth();

  // يمنع بقاء حالات تعديل حساب سابق عند تبديل الحساب.
  return <PackagesContent key={auth.user?.id ?? "guest"} auth={auth} />;
}

function PackagesContent({ auth }) {
  const { user, accessToken, isRestoring, restoreError } = auth;

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [notice, setNotice] = useState("");

  const editTriggerRef = useRef(null);

  const signedIn = Boolean(
    user?.id && accessToken && !isRestoring && !restoreError,
  );

  // مشتريات التجربة المحفوظة لهذا الحساب في المتصفح.
  const purchasesQuery = useQuery({
    queryKey: localPurchasesKey(user?.id),

    queryFn: () => readLocalPurchases(user.id),

    enabled: signedIn,
    staleTime: 0,
    retry: false,
  });

  const purchases = signedIn ? (purchasesQuery.data ?? []) : [];

  // تحديث القائمة لو تغير التخزين في تبويب آخر.
  useEffect(() => {
    if (!signedIn) return;

    function handleStorage(event) {
      if (event.key === null || event.key === purchasesStorageKey(user.id)) {
        void queryClient.invalidateQueries({
          queryKey: localPurchasesKey(user.id),
        });
      }
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [signedIn, user?.id, queryClient]);

  /*
   * قراءة كل حزمة من الباك اند باستخدام رمزها.
   * نفس queryKey المستخدمة في ClaimPage عندك.
   */
  const previewQueries = useQueries({
    queries: purchases.map((purchase) => ({
      queryKey: ["pack-preview", purchase.claimHash, user.id],

      queryFn: ({ signal }) => previewPack(purchase.claimHash, { signal }),

      staleTime: 0,
      gcTime: 0,
      retry: false,
    })),
  });

  // الأحداث التابعة للحساب؛ نحتاج event.id للتخصيص.
  const eventsQuery = useQuery({
    queryKey: ["my-events", user?.id],

    queryFn: ({ signal }) => getMyEvents(accessToken, { signal }),

    enabled: signedIn && purchases.length > 0,
    staleTime: 0,
    retry: false,
  });

  const items = purchases.map((purchase, index) => {
    const previewQuery = previewQueries[index];
    const pack = previewQuery.data;

    const verified = Boolean(pack);

    const ownedByMe = Boolean(verified && pack.owner_id === user.id);

    const ownedByAnother = Boolean(
      verified && pack.owner_id != null && pack.owner_id !== user.id,
    );

    const matchingEvents = (eventsQuery.data ?? []).filter(
      (event) => event.pack_id === pack?.id,
    );

    // لا نختار حدثًا عشوائيًا عند وجود أكثر من نتيجة.
    const targetEvent =
      ownedByMe &&
      Array.isArray(eventsQuery.data) &&
      matchingEvents.length === 1
        ? matchingEvents[0]
        : null;

    let status = "checking";

    if (previewQuery.isError) {
      status = "unavailable";
    } else if (verified && ownedByAnother) {
      status = "other";
    } else if (verified && ownedByMe) {
      status = targetEvent?.status ?? "linked";
    } else if (verified && pack.owner_id === null) {
      status = "pending";
    }

    return {
      ...purchase,

      packId: pack?.id ?? null,
      mode: pack?.mode ?? purchase.mode,
      pieces: pack?.tags_count ?? purchase.pieces,

      status,
      ownedByMe,
      eventId: targetEvent?.id ?? null,
      previewQuery,

      checkingAction: !pack || (ownedByMe && !Array.isArray(eventsQuery.data)),

      actionError: previewQuery.isError || (ownedByMe && eventsQuery.isError),

      showEmptyProgress: verified && pack.owner_id === null,
    };
  });

  function getFilterStatus(pkg) {
    if (pkg.status === "live") return "live";
    if (pkg.status === "paused") return "paused";

    return "draft";
  }
  const filters = [
    {
      value: "all",
      label: `الكل ${items.length}`,
    },
    {
      value: "draft",
      label: `ما تجهزت ${
        items.filter((pkg) => getFilterStatus(pkg) === "draft").length
      }`,
    },
    {
      value: "paused",
      label: `متوقفة ${
        items.filter((pkg) => getFilterStatus(pkg) === "paused").length
      }`,
    },
    {
      value: "live",
      label: `شغّالة ${
        items.filter((pkg) => getFilterStatus(pkg) === "live").length
      }`,
    },
  ];

  const visiblePackages = items.filter(
    (pkg) => filter === "all" || getFilterStatus(pkg) === filter,
  );

  function startEditing(pkg, event) {
    editTriggerRef.current = event.currentTarget;

    setEditingId(pkg.id);
    setDraftName(pkg.name === "بدون اسم" ? "" : pkg.name);
    setNotice("");
  }

  function closeEditing() {
    setEditingId(null);
    setDraftName("");

    requestAnimationFrame(() => {
      editTriggerRef.current?.focus();
    });
  }

  function saveName(event, purchaseId) {
    event.preventDefault();

    if (!signedIn) return;

    try {
      const updated = renameLocalPurchase(user.id, purchaseId, draftName);

      queryClient.setQueryData(localPurchasesKey(user.id), updated);

      setNotice("تم حفظ الاسم في هذا المتصفح.");
      closeEditing();
    } catch (error) {
      setNotice(error.message || "تعذر حفظ الاسم.");
    }
  }

  function openPackage(pkg) {
    if (pkg.eventId) {
      navigate(`/customization/${encodeURIComponent(pkg.eventId)}`);

      return;
    }

    // ClaimPage تتحقق مجددًا من الملكية قبل الربط.
    navigate(`/claim/${encodeURIComponent(pkg.claimHash)}`);
  }

  function getActionLabel(pkg) {
    if (pkg.eventId) {
      return "فتح التخصيص";
    }

    if (pkg.actionError) {
      return "تعذر التحقق";
    }

    if (pkg.checkingAction) {
      return "جارٍ التحقق...";
    }

    if (pkg.status === "other") {
      return "عرض حالة الحزمة";
    }

    if (pkg.ownedByMe) {
      return "متابعة الاستلام";
    }

    return "اربطها بحسابي";
  }

  return (
    <div className="packages-view" dir="rtl">
      <AppNavbar />

      <section className="packages-page" aria-labelledby="packages-title">
        <header className="packages-page__header">
          <h1 id="packages-title">باقاتي</h1>
        </header>

        {signedIn && items.length > 0 && (
          <FilterBar
            label="حالة الحزمة"
            filters={filters}
            value={filter}
            onChange={setFilter}
          />
        )}

        <p className="packages-page__announcement" role="status">
          {notice}
        </p>

        {isRestoring ? (
          <p role="status">جارٍ التحقق من الحساب...</p>
        ) : restoreError ? (
          <p role="alert">{restoreError}</p>
        ) : !signedIn ? (
          <div className="packages-page__empty">
            <p>سجّل دخولك لعرض باقاتك.</p>

            <Button onClick={() => navigate("/login")}>تسجيل الدخول</Button>
          </div>
        ) : purchasesQuery.isPending ? (
          <p role="status">جارٍ تحميل باقاتك...</p>
        ) : purchasesQuery.isError ? (
          <div className="packages-page__empty">
            <p role="alert">{purchasesQuery.error.message}</p>

            <Button variant="outline" onClick={() => purchasesQuery.refetch()}>
              إعادة المحاولة
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="packages-page__empty">
            <p role="status">
              ليس لديك حزمة نشطة حاليًا. استكشف الحزم واطلب حزمتك الآن من
              المتجر.
            </p>

            <Button onClick={() => navigate("/store")}>استكشف الحزم</Button>
          </div>
        ) : (
          <>
            {eventsQuery.isError && (
              <div className="packages-page__empty">
                <p role="alert">
                  تعذر تحميل روابط التخصيص. يمكنك متابعة الاستلام من بطاقة
                  الحزمة.
                </p>

                <Button
                  variant="outline"
                  loading={eventsQuery.isFetching}
                  onClick={() => eventsQuery.refetch()}
                >
                  إعادة المحاولة
                </Button>
              </div>
            )}

            <div className="packages-page__grid">
              {visiblePackages.map((pkg) => {
                const status = statuses[pkg.status] ?? statuses.linked;

                const isEditing = editingId === pkg.id;

                return (
                  <article
                    key={pkg.id}
                    className="package-card owned-package"
                    aria-labelledby={`package-title-${pkg.id}`}
                  >
                    <div
                      className={`package-card__cover package-card__cover--${pkg.coverTone}`}
                    >
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

                      <div className="owned-package__badges">
                        <Chip tone={status.tone}>{status.label}</Chip>
                      </div>
                    </div>

                    <div className="owned-package__body">
                      <div className="owned-package__heading">
                        {isEditing ? (
                          <form
                            className="owned-package__rename"
                            onSubmit={(event) => saveName(event, pkg.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                event.preventDefault();
                                closeEditing();
                              }
                            }}
                          >
                            <label
                              className="packages-page__sr-only"
                              htmlFor={`package-name-${pkg.id}`}
                            >
                              اسم الحزمة
                            </label>

                            <input
                              id={`package-name-${pkg.id}`}
                              value={draftName}
                              onChange={(event) =>
                                setDraftName(event.target.value)
                              }
                              maxLength={20}
                              required
                              autoFocus
                              aria-describedby={`name-hint-${pkg.id}`}
                            />

                            <Button
                              type="submit"
                              variant="tertiary"
                              className="owned-package__icon-button"
                              disabled={!draftName.trim()}
                              aria-label="حفظ اسم الحزمة"
                            >
                              <Check size={18} aria-hidden="true" />
                            </Button>

                            <Button
                              variant="tertiary"
                              className="owned-package__icon-button"
                              onClick={closeEditing}
                              aria-label="إلغاء تعديل الاسم"
                            >
                              <X size={18} aria-hidden="true" />
                            </Button>

                            <small id={`name-hint-${pkg.id}`}>
                              {draftName.length}/20 حرف
                            </small>

                            <h2
                              id={`package-title-${pkg.id}`}
                              className="packages-page__sr-only"
                            >
                              {pkg.name}
                            </h2>
                          </form>
                        ) : (
                          <>
                            <h2 id={`package-title-${pkg.id}`}>{pkg.name}</h2>

                            <Button
                              variant="tertiary"
                              className="owned-package__icon-button"
                              onClick={(event) => startEditing(pkg, event)}
                              aria-label={`تعديل اسم ${pkg.name}`}
                            >
                              <Pencil size={18} aria-hidden="true" />
                            </Button>
                          </>
                        )}
                      </div>

                      <dl className="owned-package__info">
                        <div>
                          <dt>رقم الحزمة</dt>
                          <dd>
                            <bdi>{pkg.packId ?? "يظهر بعد التحقق"}</bdi>
                          </dd>
                        </div>

                        <div>
                          <dt>النوع</dt>
                          <dd>{getModeLabel(pkg.mode)}</dd>
                        </div>

                        <div>
                          <dt>عدد القطع</dt>
                          <dd>{pkg.pieces} قطعة NFC</dd>
                        </div>
                      </dl>

                      {pkg.showEmptyProgress && (
                        <div className="owned-package__progress">
                          <div className="owned-package__progress-label">
                            <label htmlFor={`progress-${pkg.id}`}>
                              القطع المحفوظة
                            </label>

                            <bdi>0/{pkg.pieces}</bdi>
                          </div>

                          <progress
                            id={`progress-${pkg.id}`}
                            max={pkg.pieces}
                            value={0}
                          />
                        </div>
                      )}

                      {pkg.previewQuery.isError && (
                        <>
                          <p role="alert" className="owned-package__note">
                            تعذر التحقق من الحزمة.
                          </p>

                          <Button
                            variant="outline"
                            loading={pkg.previewQuery.isFetching}
                            onClick={() => pkg.previewQuery.refetch()}
                          >
                            إعادة المحاولة
                          </Button>
                        </>
                      )}

                      <div className="owned-package__actions">
                        <Button
                          fullWidth
                          loading={pkg.checkingAction && !pkg.actionError}
                          disabled={pkg.checkingAction || pkg.actionError}
                          onClick={() => openPackage(pkg)}
                        >
                          {getActionLabel(pkg)}
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {visiblePackages.length === 0 && (
              <p className="packages-page__empty" role="status">
                لا توجد حزم مطابقة لهذا الفلتر.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
