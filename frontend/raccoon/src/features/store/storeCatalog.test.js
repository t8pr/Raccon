import { describe, expect, test } from "vitest";
import { CHECKOUT_LINKS } from "./checkoutLinks";
import { STORE_PACKAGES, filterAndSort } from "./storeCatalog";

const all = { mode: "all", size: "all", sort: "default" };
const ids = (list) => list.map((pkg) => pkg.id);

describe("STORE_PACKAGES", () => {
  test("8 بكجات: طريقتين × 4 أحجام", () => {
    expect(ids(STORE_PACKAGES)).toEqual([
      "sequential-6",
      "sequential-10",
      "sequential-15",
      "sequential-21",
      "open-6",
      "open-10",
      "open-15",
      "open-21",
    ]);
  });

  test("كل بكج له رابط دفع من checkoutLinks", () => {
    for (const pkg of STORE_PACKAGES) {
      expect(pkg.purchaseUrl).toBe(CHECKOUT_LINKS[pkg.id]);
    }
  });
});

describe("filterAndSort", () => {
  test("الافتراضي يرجع الكل بنفس الترتيب", () => {
    expect(ids(filterAndSort(STORE_PACKAGES, all))).toEqual(ids(STORE_PACKAGES));
  });

  test("فلتر الطريقة", () => {
    const list = filterAndSort(STORE_PACKAGES, { ...all, mode: "open" });

    expect(list).toHaveLength(4);
    expect(list.every((pkg) => pkg.mode === "open")).toBe(true);
  });

  test("فلتر الحجم يجي نص من القائمة", () => {
    expect(ids(filterAndSort(STORE_PACKAGES, { ...all, size: "10" }))).toEqual([
      "sequential-10",
      "open-10",
    ]);
  });

  test("الترتيب بالسعر", () => {
    const prices = (sort) =>
      filterAndSort(STORE_PACKAGES, { ...all, sort }).map((pkg) => pkg.price);

    expect(prices("price-asc")).toEqual([79, 79, 130, 130, 195, 195, 273, 273]);
    expect(prices("price-desc")).toEqual([273, 273, 195, 195, 130, 130, 79, 79]);
  });

  test("فلاتر بدون نتائج", () => {
    expect(filterAndSort(STORE_PACKAGES, { ...all, size: "7" })).toEqual([]);
  });

  test("ما يغيّر القائمة الأصلية", () => {
    const before = ids(STORE_PACKAGES);

    filterAndSort(STORE_PACKAGES, { ...all, sort: "price-desc" });

    expect(ids(STORE_PACKAGES)).toEqual(before);
  });
});
