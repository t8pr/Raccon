import FilterBar from "../../../shared/ui/FilterBar";
import SortButton from "../../../shared/ui/SortButton";
import { MODE_FILTERS, SORTS } from "../storeCatalog";

// الفلاتر (Figma "User · Store"): طريقة اللعب (أزرار) والترتيب. الحجم والسعر صار ترتيب.
export function StoreFilters({ mode, sort, onModeChange, onSortChange }) {
  return (
    <FilterBar
      filters={MODE_FILTERS}
      value={mode}
      onChange={onModeChange}
      label="طريقة اللعب"
      sort={<SortButton options={SORTS} value={sort} onChange={onSortChange} />}
    />
  );
}
