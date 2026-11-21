import { useState } from "react";

import AppNavbar from "../../shared/layout/AppNavbar";
import ExperiencePackCard from "../../shared/ui/ExperiencePackCard";

import CheckoutDialog from "./components/CheckoutDialog";
import { StoreFilters } from "./components/StoreToolbar";
import { useCheckout } from "./hooks/useCheckout";
import { STORE_PACKAGES, filterAndSort } from "./storeCatalog";
import "./StorePage.css";

/*
  المتجر (Figma: C. المتجر): ثمانية بكجات ثابتة، والشراء يحوّل لصفحة الدفع في رمز.
    checkoutLinks.js  روابط الدفع لكل بكج (الملف الوحيد الذي يتغير عند تغيير الروابط)
    storeCatalog.js   البكجات، الفلاتر، الترتيب
    StoreToolbar      الفلاتر
    useCheckout       نافذة التأكيد والتحويل
    CheckoutDialog    محتوى النافذة
*/
export default function StorePage() {
  const [mode, setMode] = useState("all");
  const [sort, setSort] = useState("default");

  const checkout = useCheckout();

  const visiblePackages = filterAndSort(STORE_PACKAGES, { mode, size: "all", sort });

  return (
    <div className="store-view" dir="rtl">
      <AppNavbar />

      <section className="store-page" aria-labelledby="store-title">
        <h1 id="store-title">المتجر</h1>

        <StoreFilters
          mode={mode}
          sort={sort}
          onModeChange={setMode}
          onSortChange={setSort}
        />

        {checkout.error && <p role="alert">{checkout.error}</p>}

        <div className="store-page__grid">
          {visiblePackages.map((pkg) => (
            <ExperiencePackCard
              key={pkg.id}
              variant="store"
              {...pkg}
              loading={checkout.redirecting === pkg.id}
              disabled={Boolean(checkout.redirecting)}
              onBuy={() => checkout.confirm(pkg)}
            />
          ))}
        </div>
      </section>

      <CheckoutDialog checkout={checkout} />
    </div>
  );
}
