import { describe, expect, test } from "vitest";
import { PACK_SIZES, closestSize, piecesLabel, priceFor } from "./packSizes";

test("الأحجام والأسعار الثابتة", () => {
  expect(PACK_SIZES).toEqual([
    { pieces: 6, price: 79 },
    { pieces: 10, price: 130 },
    { pieces: 15, price: 195 },
    { pieces: 21, price: 273 },
  ]);
});

test("priceFor", () => {
  expect(priceFor(10)).toBe(130);
  expect(priceFor(7)).toBeNull();
});

describe("piecesLabel", () => {
  test.each([
    [3, "3 قطع"],
    [10, "10 قطع"],
    [11, "11 قطعة"],
    [21, "21 قطعة"],
    [2, "2 قطعة"],
  ])("%i → %s", (pieces, label) => {
    expect(piecesLabel(pieces)).toBe(label);
  });
});

describe("closestSize", () => {
  test.each([
    [6, 6],
    [8, 6], // التعادل يأخذ الأصغر
    [12, 10],
    [13, 15],
    [100, 21],
  ])("%i → %i", (pieces, size) => {
    expect(closestSize(pieces)).toBe(size);
  });
});
