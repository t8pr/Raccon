import { describe, expect, test } from "vitest";
import {
  UNTITLED,
  filterPackages,
  getDisplayName,
  toPackageItem,
} from "./packageItems";

describe("getDisplayName", () => {
  test.each([
    ["  جولة الحديقة  ", "جولة الحديقة"],
    ["Untitled Event", UNTITLED],
    ["untitled", UNTITLED],
    ["بدون اسم", UNTITLED],
    ["   ", UNTITLED],
    ["", UNTITLED],
    [null, UNTITLED],
    [undefined, UNTITLED],
  ])("%j → %s", (title, name) => {
    expect(getDisplayName(title)).toBe(name);
  });
});

test("toPackageItem يحوّل جولة الخادم لبطاقة", () => {
  expect(
    toPackageItem({
      id: "e1",
      title: "مكتب",
      mode: "seq",
      tags_count: 10,
      status: "live",
    }),
  ).toEqual({ id: "e1", eventId: "e1", name: "مكتب", mode: "seq", pieces: 10 });
});

describe("filterPackages", () => {
  const items = [
    { id: 1, mode: "seq" },
    { id: 2, mode: "sequential" },
    { id: 3, mode: "open" },
    { id: 4, mode: null },
  ];
  const ids = (list) => list.map((pkg) => pkg.id);

  test("الكل", () => {
    expect(ids(filterPackages(items, "all"))).toEqual([1, 2, 3, 4]);
  });

  test("التسلسلي يشمل seq و sequential", () => {
    expect(ids(filterPackages(items, "sequential"))).toEqual([1, 2]);
  });

  test("المفتوح", () => {
    expect(ids(filterPackages(items, "open"))).toEqual([3]);
  });
});
