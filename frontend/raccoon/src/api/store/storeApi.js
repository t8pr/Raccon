// Store data.
import { PACK_SIZES } from "../../pages/Admin/Experiences/packSizes";

/*
"اصنع تجربتك" (make it your own) products.

TODAY: the backend has no public store endpoint (GET /admin/packs is admin-only),
so we build the products from the fixed sizes: 2 modes × 4 sizes.

LATER: when the backend adds GET /store/products?kind=custom, replace the body with:
  return apiRequest("/store/products?kind=custom", { signal }, "تعذر تحميل المتجر.");
The page won't need any other change — it already calls this with useQuery.
*/
export async function getCustomProducts() {
  return ["sequential", "open"].flatMap((mode) =>
    PACK_SIZES.map(({ pieces, price }) => ({
      id: `custom-${mode}-${pieces}`,
      kind: "custom",
      mode,
      pieces,
      price,
    })),
  );
}
