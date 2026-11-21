import { describe, expect, test } from "vitest";
import {
  MODE_OPTIONS,
  fromBackendMode,
  getModeLabel,
  normalizeMode,
  toBackendMode,
} from "./modes";

describe("normalizeMode", () => {
  test.each([
    ["seq", "sequential"],
    ["sequential", "sequential"],
    ["open", "open"],
    ["other", null],
    [undefined, null],
    [null, null],
  ])("%s → %s", (input, expected) => {
    expect(normalizeMode(input)).toBe(expected);
  });
});

describe("getModeLabel", () => {
  test("يقبل صيغة الخادم وصيغة الواجهة", () => {
    expect(getModeLabel("seq")).toBe("تسلسلي");
    expect(getModeLabel("sequential")).toBe("تسلسلي");
    expect(getModeLabel("open")).toBe("صيد مفتوح");
  });

  test("قيمة غير معروفة ترجع البديل", () => {
    expect(getModeLabel(null)).toBe("غير محدد");
    expect(getModeLabel("x", "—")).toBe("—");
  });
});

describe("التحويل بين الواجهة والخادم", () => {
  test("toBackendMode", () => {
    expect(toBackendMode("sequential")).toBe("seq");
    expect(toBackendMode("seq")).toBe("seq");
    expect(toBackendMode("open")).toBe("open");
  });

  test("fromBackendMode", () => {
    expect(fromBackendMode("seq")).toBe("sequential");
    expect(fromBackendMode("open")).toBe("open");
  });
});

test("MODE_OPTIONS فيها الطريقتين بالترتيب", () => {
  expect(MODE_OPTIONS.map((option) => option.value)).toEqual(["sequential", "open"]);
});
