import { describe, expect, test } from "vitest";
import { getClaimerName, getErrorKind, getExpectedTag, padTag, toScanError } from "./scanErrors";

test("padTag يكتب الرقم بخانتين", () => {
  expect(padTag(7)).toBe("07");
  expect(padTag("3")).toBe("03");
  expect(padTag(12)).toBe("12");
  expect(padTag(null)).toBe("00");
});

describe("toScanError", () => {
  test("detail نصي", () => {
    expect(toScanError({ detail: "This event is not live." })).toEqual({
      code: "unknown",
      message: "This event is not live.",
    });
  });

  test("detail كائن فيه code يرجع كما هو", () => {
    const detail = { code: "freeze", message: "Frozen", remaining_seconds: 30 };

    expect(toScanError({ detail })).toBe(detail);
  });

  test("بدون detail رسالة افتراضية", () => {
    expect(toScanError({})).toEqual({ code: "unknown", message: "تعذر قراءة البطاقة." });
  });
});

describe("getErrorKind", () => {
  test.each(["already_scanned", "claimed_by_another_player", "freeze", "skipped_tag"])(
    "الكود %s من الخادم",
    (code) => {
      expect(getErrorKind({ code, message: "x" })).toBe(code);
    },
  );

  test.each([
    ["This event is not live.", "not_live"],
    ["Security Violation: tag does not belong to this user", "not_yours"],
    ["You have already completed this journey.", "completed"],
    ["Something else", "unknown"],
  ])("من الرسالة: %s", (message, kind) => {
    expect(getErrorKind({ code: "unknown", message })).toBe(kind);
  });

  test("بدون خطأ", () => {
    expect(getErrorKind(null)).toBe("unknown");
    expect(getErrorKind(undefined)).toBe("unknown");
  });
});

test("getClaimerName يطلع اسم اللاعب اللي سبقك", () => {
  expect(getClaimerName("Sorry, نورة claimed this tag before you!")).toBe("نورة");
  expect(getClaimerName("Sorry, Abu Ali claimed this tag before you!")).toBe("Abu Ali");
  expect(getClaimerName("Other message")).toBeUndefined();
  expect(getClaimerName(undefined)).toBeUndefined();
});

test("getExpectedTag يطلع رقم القطعة المطلوبة", () => {
  expect(getExpectedTag("Skipped tag! You must scan tag 4 first.")).toBe("4");
  expect(getExpectedTag("No number")).toBeUndefined();
  expect(getExpectedTag(undefined)).toBeUndefined();
});
