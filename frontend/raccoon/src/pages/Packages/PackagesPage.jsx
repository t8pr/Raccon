import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import AppNavbar from "../../components/layout/AppNavbar";
import Button from "../../components/ui/Button";
import FilterBar from "../../components/ui/FilterBar";

import "../../styles/PackagesPage.css";

import { useAuth } from "../../context/AuthContext";
import { getMyEvents } from "../../api/events/eventsApi";

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

  const [filter, setFilter] = useState("all");
  const signedIn = Boolean(
    user?.id && accessToken && !isRestoring && !restoreError,
  );

  // الأحداث التابعة للحساب؛ نحتاج event.id للتخصيص.
  const eventsQuery = useQuery({
    queryKey: ["my-events", user?.id],
    queryFn: ({ signal }) => getMyEvents(accessToken, { signal }),
    enabled: signedIn,
    staleTime: 0,
    retry: false,
  });

  const items = signedIn
    ? (eventsQuery.data ?? []).map((event) => {
        const title = event.title?.trim() ?? "";
        const isUntitled =
          !title || /^(untitled(?:\s+event)?|بدون اسم)$/i.test(title);

        return {
          id: event.id,
          eventId: event.id,
          name: isUntitled ? "بدون اسم" : title,
          mode: event.mode,
          pieces: event.tags_count,
        };
      })
    : [];

  const filters = [
    { value: "all", label: "الكل" },
    { value: "sequential", label: "تسلسلي" },
    { value: "open", label: "صيد مفتوح" },
  ];
  const visiblePackages = items.filter(
    (pkg) =>
      filter === "all" ||
      (pkg.mode === "seq" ? "sequential" : pkg.mode) === filter,
  );

  function openPackage(pkg) {
    navigate(`/customization/${encodeURIComponent(pkg.eventId)}`);
  }

  return (
    <div className="packages-view" dir="rtl">
      <AppNavbar />

      <section className="packages-page" aria-labelledby="packages-title">
        <header className="packages-page__header">
          <h1 id="packages-title">التجارب</h1>
        </header>

        {signedIn && items.length > 0 && (
          <FilterBar
            label="طريقة اللعب"
            filters={filters}
            value={filter}
            onChange={setFilter}
          />
        )}

        {isRestoring ? (
          <p role="status">جارٍ التحقق من الحساب...</p>
        ) : restoreError ? (
          <p role="alert">{restoreError}</p>
        ) : !signedIn ? (
          <div className="packages-page__empty">
            <p>سجّل دخولك لعرض باقاتك.</p>

            <Button onClick={() => navigate("/login")}>تسجيل الدخول</Button>
          </div>
        ) : eventsQuery.isPending ? (
          <p role="status">جارٍ تحميل باقاتك...</p>
        ) : eventsQuery.isError ? (
          <div className="packages-page__empty">
            <p role="alert">{eventsQuery.error.message}</p>

            <Button variant="outline" onClick={() => eventsQuery.refetch()}>
              إعادة المحاولة
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="packages-page__empty">
            <p role="status">لا توجد باقات مرتبطة بحسابك حاليًا.</p>

            <Button onClick={() => navigate("/store")}>استكشف الحزم</Button>
          </div>
        ) : (
          <>
            <div className="packages-page__grid">
              {visiblePackages.map((pkg) => (
                <article
                  key={pkg.id}
                  className={`event-pack event-pack--${pkg.mode === "open" ? "open" : "seq"}`}
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
                    onClick={() => openPackage(pkg)}
                    aria-label={`تخصيص ${pkg.name}`}
                  >
                    تخصيص
                  </button>
                </article>
              ))}
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
