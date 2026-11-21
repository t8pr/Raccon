import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { STORE_PACKAGES } from "../storeCatalog";
import { useCheckout } from "./useCheckout";

const pkg = STORE_PACKAGES.find((item) => item.id === "open-15");
let assign;

beforeEach(() => {
  assign = vi.fn();
  vi.stubGlobal("location", { ...window.location, assign });

  return () => vi.unstubAllGlobals();
});

// الـhook يحتاج عنصر <dialog> حقيقي في dialogRef، مثل CheckoutDialog
function renderCheckout() {
  const dialog = document.createElement("dialog");
  document.body.append(dialog);

  const view = renderHook(() => useCheckout());
  view.result.current.dialogRef.current = dialog;

  // CheckoutDialog يربط حدث الإغلاق بـ handleClosed
  dialog.addEventListener("close", () => view.result.current.handleClosed());

  return { ...view, dialog };
}

describe("confirm", () => {
  test("يفتح نافذة التأكيد ويقفل تمرير الصفحة", () => {
    const { result, dialog } = renderCheckout();

    act(() => result.current.confirm(pkg));

    expect(result.current.selected).toBe(pkg);
    expect(dialog.open).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
  });

  test("رابط دفع غير صالح: رسالة خطأ بدون نافذة", () => {
    const { result, dialog } = renderCheckout();

    act(() => result.current.confirm({ ...pkg, purchaseUrl: "http://insecure.test" }));

    expect(result.current.error).toBe("رابط الدفع لهذا البكج غير متاح حاليًا. حاول لاحقًا.");
    expect(result.current.selected).toBeNull();
    expect(dialog.open).toBe(false);
  });
});

test("الإلغاء يقفل النافذة ويرجع التمرير", () => {
  const { result, dialog } = renderCheckout();
  act(() => result.current.confirm(pkg));

  act(() => result.current.close());

  expect(dialog.open).toBe(false);
  expect(result.current.selected).toBeNull();
  expect(document.body.style.overflow).toBe("");
});

describe("buy", () => {
  test("يحوّل لرابط الدفع الصحيح ويعطّل باقي الأزرار", () => {
    const { result, dialog } = renderCheckout();
    act(() => result.current.confirm(pkg));

    act(() => result.current.buy());

    expect(assign).toHaveBeenCalledWith("https://raccon.rmz.gg/product/15open");
    expect(result.current.redirecting).toBe("open-15");
    expect(dialog.open).toBe(false);
  });

  test("ضغطتين ما تحوّل مرتين", () => {
    const { result } = renderCheckout();
    act(() => result.current.confirm(pkg));

    act(() => {
      result.current.buy();
      result.current.buy();
    });

    expect(assign).toHaveBeenCalledTimes(1);
  });

  test("أثناء التحويل ما يفتح بكج ثاني", () => {
    const { result } = renderCheckout();
    act(() => result.current.confirm(pkg));
    act(() => result.current.buy());

    act(() => result.current.confirm(STORE_PACKAGES[0]));

    expect(result.current.selected).toBeNull();
  });

  test("فشل فتح صفحة الدفع: رسالة ويرجع كل شي", () => {
    assign.mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderCheckout();
    act(() => result.current.confirm(pkg));

    act(() => result.current.buy());

    expect(result.current.error).toBe("تعذر فتح صفحة الدفع. حاول مرة أخرى.");
    expect(result.current.redirecting).toBeNull();
  });
});

test("الرجوع من صفحة الدفع (pageshow) يفك القفل", () => {
  const { result } = renderCheckout();
  act(() => result.current.confirm(pkg));
  act(() => result.current.buy());

  act(() => window.dispatchEvent(new Event("pageshow")));

  expect(result.current.redirecting).toBeNull();
  act(() => result.current.confirm(STORE_PACKAGES[0]));
  expect(result.current.selected).toBe(STORE_PACKAGES[0]);
});
