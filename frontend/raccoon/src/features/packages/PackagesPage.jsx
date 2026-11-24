import { useState } from "react";
import { useNavigate } from "react-router-dom";

import AppNavbar from "../../shared/layout/AppNavbar/AppNavbar";
import Button from "../../shared/ui/Button/Button";
import FilterBar from "../../shared/ui/FilterBar/FilterBar";
import { useAuth } from "../../shared/auth/AuthContext";

import { useMyPackages } from "./hooks/useMyPackages";
import EventPackCard from "./components/EventPackCard";
import { PACKAGE_FILTERS, filterPackages } from "./packageItems";
import "./PackagesPage.css";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
    content = <p role="status">{t("common.checkingAccount")}</p>;
  } else if (restoreError) {
    content = <p role="alert">{restoreError}</p>;
  } else if (!signedIn) {
    content = (
      <div className="packages-page__empty">
        <p>{t("packages.loginToView")}</p>

        <Button onClick={() => navigate("/login")}>{t("authNav.login")}</Button>
      </div>
    );
  } else if (eventsQuery.isPending) {
    content = <p role="status">{t("packages.loading")}</p>;
  } else if (eventsQuery.isError) {
    content = (
      <div className="packages-page__empty">
        <p role="alert">{eventsQuery.error.message}</p>

        <Button variant="outline" onClick={() => eventsQuery.refetch()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  } else if (items.length === 0) {
    content = (
      <div className="packages-page__empty">
        <p role="status">{t("packages.empty")}</p>

        <Button onClick={() => navigate("/store")}>{t("packages.explore")}</Button>
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
            {t("packages.noMatch")}
          </p>
        )}
      </>
    );
  }

  return (
    <div className="packages-view">
      <AppNavbar />

      <section className="packages-page" aria-labelledby="packages-title">
        <header className="packages-page__header">
          <h1 id="packages-title">{t("nav.packages")}</h1>
        </header>

        {signedIn && items.length > 0 && (
          <FilterBar
            label={t("common.playMode")}
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
