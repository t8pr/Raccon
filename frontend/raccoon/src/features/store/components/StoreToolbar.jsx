import FilterBar from "../../../shared/ui/FilterBar/FilterBar";
import SortButton from "../../../shared/ui/SortButton/SortButton";
import { MODE_FILTERS, SORTS } from "../storeCatalog";
import { useTranslation } from "react-i18next";

// الفلاتر (Figma "User · Store"): طريقة اللعب (أزرار) والترتيب. الحجم والسعر صار ترتيب.
export function StoreFilters({ mode, sort, onModeChange, onSortChange }) {
  const { t } = useTranslation();
  return (
    <FilterBar
      filters={MODE_FILTERS}
      value={mode}
      onChange={onModeChange}
      label={t("common.playMode")}
      sort={<SortButton options={SORTS} value={sort} onChange={onSortChange} />}
    />
  );
}
