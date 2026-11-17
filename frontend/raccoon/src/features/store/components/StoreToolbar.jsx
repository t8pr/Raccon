import { ChevronDown } from "lucide-react";

import FilterBar from "../../../shared/ui/FilterBar";
import SortButton from "../../../shared/ui/SortButton";
import { PACK_SIZES } from "../../../shared/constants/packSizes";
import { MODE_FILTERS, SORTS } from "../storeCatalog";

// الفلاتر: الطريقة (أزرار)، الحجم والسعر (قائمة)، والترتيب
export function StoreFilters({ mode, size, sort, onModeChange, onSizeChange, onSortChange }) {
  return (
    <FilterBar
      filters={MODE_FILTERS}
      value={mode}
      onChange={onModeChange}
      label="طريقة اللعب"
      sort={
        <div className="store-page__selects">
          <label className="sort-button store-page__size">
            <select
              aria-label="الحجم والسعر"
              value={size}
              onChange={(event) => onSizeChange(event.target.value)}
            >
              <option value="all">الحجم والسعر: الكل</option>
              {PACK_SIZES.map((item) => (
                <option key={item.pieces} value={item.pieces}>
                  {item.pieces} قطعة · {item.price} ر.س
                </option>
              ))}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </label>
          <SortButton options={SORTS} value={sort} onChange={onSortChange} />
        </div>
      }
    />
  );
}
