import { describe, expect, test } from "vitest";
import { clampFreezeSeconds, isValidFreezeSeconds } from "./trapRules";

describe("isValidFreezeSeconds", () => {
  test.each([1, 60, 180, "90"])("%s مقبولة", (value) => {
    expect(isValidFreezeSeconds(value)).toBe(true);
  });

  test.each([0, 181, 1.5, "", "  ", "abc", null, undefined])("%s مرفوضة", (value) => {
    expect(isValidFreezeSeconds(value)).toBe(false);
  });
});

test("clampFreezeSeconds يبقي القيمة بين 1 و 180", () => {
  expect(clampFreezeSeconds(0)).toBe(1);
  expect(clampFreezeSeconds(500)).toBe(180);
  expect(clampFreezeSeconds(90)).toBe(90);
});
