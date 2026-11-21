// المتجر: البكجات الثمانية، الفلاتر، الترتيب. دوال خالصة.
import { MODE, MODE_OPTIONS } from "../../shared/constants/modes";
import { PACK_SIZES } from "../../shared/constants/packSizes";
import { CHECKOUT_LINKS } from "./checkoutLinks";

// قائمة ثابتة: كل طريقة لعب × كل حجم. لا تعتمد على تجارب الأدمن ولا على الخادم.
export const STORE_PACKAGES = [MODE.SEQUENTIAL, MODE.OPEN].flatMap((mode) =>
  PACK_SIZES.map((size) => ({
    ...size,
    mode,
    id: `${mode}-${size.pieces}`,
    purchaseUrl: CHECKOUT_LINKS[`${mode}-${size.pieces}`],
  })),
);

export const MODE_FILTERS = [{ value: "all", label: "الكل" }, ...MODE_OPTIONS];

export const SORTS = [
  { value: "default", label: "الترتيب الافتراضي" },
  { value: "price-asc", label: "السعر: الأقل أولًا" },
  { value: "price-desc", label: "السعر: الأعلى أولًا" },
];

// يفلتر حسب الطريقة والحجم ثم يرتّب. size نص من القائمة ("all" أو عدد القطع).
// "default" يبقي ترتيب القائمة كما هو.
export function filterAndSort(source, { mode, size, sort }) {
  const visible = source.filter(
    (pkg) =>
      (mode === "all" || pkg.mode === mode) &&
      (size === "all" || pkg.pieces === Number(size)),
  );

  if (sort === "price-asc") {
    visible.sort((a, b) => a.price - b.price);
  } else if (sort === "price-desc") {
    visible.sort((a, b) => b.price - a.price);
  }

  return visible;
}
