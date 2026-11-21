import { expect, test } from "vitest";
import { queryKeys } from "./queryKeys";

test("بدون معاملات ترجع البادئة فقط", () => {
  expect(queryKeys.profile()).toEqual(["profile"]);
  expect(queryKeys.adminPacks()).toEqual(["admin-packs"]);
});

test("المفاتيح الكاملة", () => {
  expect(queryKeys.profile("t")).toEqual(["profile", "t"]);
  expect(queryKeys.myEvents(7)).toEqual(["my-events", 7]);
  expect(queryKeys.event("e1", "t")).toEqual(["event", "e1", "t"]);
  expect(queryKeys.packInfo(7, 3)).toEqual(["pack-info", 7, 3]);
  expect(queryKeys.claimEvents(7, 3)).toEqual(["claim-events", 7, 3]);
  expect(queryKeys.adminPacks(2, 9)).toEqual(["admin-packs", 2, 9]);
});

test("معاينة الباكج للزائر تستخدم guest", () => {
  expect(queryKeys.packPreview("h")).toEqual(["pack-preview", "h", "guest"]);
  expect(queryKeys.packPreview("h", 7)).toEqual(["pack-preview", "h", 7]);
});
