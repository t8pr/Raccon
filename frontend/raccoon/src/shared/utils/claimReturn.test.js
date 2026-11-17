import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { rememberClaimReturn, takeClaimReturn } from "./claimReturn";

const KEY = "raccoon_claim_return";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-17T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

test("يحفظ المسار ويرجعه مرة وحدة فقط", () => {
  rememberClaimReturn("/claim/abc_123");

  expect(takeClaimReturn()).toBe("/claim/abc_123");
  expect(takeClaimReturn()).toBeNull();
});

test("يرفض أي مسار غير صفحة الاستلام", () => {
  expect(() => rememberClaimReturn("/home")).toThrow();
  expect(() => rememberClaimReturn("https://evil.test/claim/x")).toThrow();
});

test("ينتهي بعد ساعة", () => {
  rememberClaimReturn("/claim/abc");
  vi.advanceTimersByTime(60 * 60 * 1000 + 1);

  expect(takeClaimReturn()).toBeNull();
});

test("بيانات تالفة في التخزين ترجع null وتنمسح", () => {
  sessionStorage.setItem(KEY, "{not json");
  expect(takeClaimReturn()).toBeNull();

  sessionStorage.setItem(KEY, JSON.stringify({ path: "/home", createdAt: Date.now() }));
  expect(takeClaimReturn()).toBeNull();
  expect(sessionStorage.getItem(KEY)).toBeNull();
});
