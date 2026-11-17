import { useState } from "react";
import { useNavigate } from "react-router-dom";

import AppNavbar from "../../shared/layout/AppNavbar";
import Button from "../../shared/ui/Button";
import FilterBar from "../../shared/ui/FilterBar";
import { useAuth } from "../../shared/auth/AuthContext";

import { useMyPackages } from "./hooks/useMyPackages";
import EventPackCard from "./components/EventPackCard";
import { PACKAGE_FILTERS, filterPackages } from "./packageItems";
import "./PackagesPage.css";

/*
  صفحة «التجارب» (باقاتي): كل جولات المستخدم، فلترة حسب طريقة اللعب، وفتح التخصيص.
  البيانات في useMyPackages، والبطاقة في EventPackCard. تعديل الاسم في صفحة التخصيص.
*/
export default function PackagesPage() {
  const auth = useAuth();

  // يعيد ضبط الفلتر عند تبديل الحساب.
  return <PackagesContent key={auth.user?.id ?? "guest"} auth={auth} />;
}

function PackagesContent({ auth }) {
  const { isRestoring, restoreError } = auth;
  const navigate = useNavigate();

  const { signedIn, eventsQuery, items } = useMyPackages(auth);
  const [filter, setFilter] = useState("all");

  const visiblePackages = filterPackages(items, filter);

  function openPackage(pkg) {
    navigate(`/customization/${encodeURIComponent(pkg.eventId)}`);
  }

  let content;

  if (isRestoring) {
    content = <p role="status">جارٍ التحقق من الحساب...</p>;
  } else if (restoreError) {
    content = <p role="alert">{restoreError}</p>;
  } else if (!signedIn) {
    content = (
      <div className="packages-page__empty">
        <p>سجّل دخولك لعرض باقاتك.</p>

        <Button onClick={() => navigate("/login")}>تسجيل الدخول</Button>
      </div>
    );
  } else if (eventsQuery.isPending) {
    content = <p role="status">جارٍ تحميل باقاتك...</p>;
  } else if (eventsQuery.isError) {
    content = (
      <div className="packages-page__empty">
        <p role="alert">{eventsQuery.error.message}</p>

        <Button variant="outline" onClick={() => eventsQuery.refetch()}>
          إعادة المحاولة
        </Button>
      </div>
    );
  } else if (items.length === 0) {
    content = (
      <div className="packages-page__empty">
        <p role="status">لا توجد باقات مرتبطة بحسابك حاليًا.</p>

        <Button onClick={() => navigate("/store")}>استكشف الحزم</Button>
      </div>
    );
  } else {
    content = (
      <>
        <div className="packages-page__grid">
          {visiblePackages.map((pkg) => (
            <EventPackCard key={pkg.id} pkg={pkg} onOpen={openPackage} />
          ))}
        </div>

        {visiblePackages.length === 0 && (
          <p className="packages-page__empty" role="status">
            لا توجد حزم مطابقة لهذا الفلتر.
          </p>
        )}
      </>
    );
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
            filters={PACKAGE_FILTERS}
            value={filter}
            onChange={setFilter}
          />
        )}

        {content}
      </section>
    </div>
  );
}
