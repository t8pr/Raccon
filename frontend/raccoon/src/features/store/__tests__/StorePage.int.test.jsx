import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { renderWithProviders } from "../../../test/renderWithProviders";
import StorePage from "../StorePage";

let assign;

beforeEach(() => {
  assign = vi.fn();
  vi.stubGlobal("location", { ...window.location, assign });
  return () => vi.unstubAllGlobals();
});

const renderStore = (options) =>
  renderWithProviders(<StorePage />, { route: "/store", ...options });
const cards = () =>
  screen.getAllByRole("article").map((card) => card.getAttribute("aria-label"));

test("8 بكجات للزائر والمستخدم بدون أي طلب للخادم", () => {
  renderStore({ token: null });

  expect(screen.getByRole("heading", { name: "المتجر" })).toBeInTheDocument();
  expect(cards()).toEqual([
    "تسلسلي · 6 قطعة",
    "تسلسلي · 10 قطعة",
    "تسلسلي · 15 قطعة",
    "تسلسلي · 21 قطعة",
    "صيد مفتوح · 6 قطعة",
    "صيد مفتوح · 10 قطعة",
    "صيد مفتوح · 15 قطعة",
    "صيد مفتوح · 21 قطعة",
  ]);
});

describe("الفلاتر والترتيب", () => {
  // Figma "User · Store": أزرار الطريقة + الترتيب «الحجم والسعر». ما فيه قائمة حجم ولا «امسح الفلاتر».
  test("فلتر الطريقة، والترتيب الافتراضي «الحجم والسعر»", async () => {
    renderStore();

    expect(screen.queryByRole("combobox", { name: "الحجم والسعر" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "ترتيب الباكجات" })).toHaveTextContent(
      "ترتيب: الحجم والسعر",
    );

    await userEvent.click(screen.getByRole("button", { name: "صيد مفتوح" }));
    expect(cards()).toHaveLength(4);
    expect(cards().every((label) => label.startsWith("صيد مفتوح"))).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "الكل" }));
    expect(cards()).toHaveLength(8);
  });

  test("الترتيب من الأغلى", async () => {
    renderStore();

    await userEvent.click(screen.getByRole("combobox", { name: "ترتيب الباكجات" }));
    await userEvent.click(await screen.findByRole("option", { name: "السعر: الأعلى أولًا" }));

    expect(cards().slice(0, 2)).toEqual([
      "تسلسلي · 21 قطعة",
      "صيد مفتوح · 21 قطعة",
    ]);
  });
});

describe("الشراء", () => {
  async function openCheckout(label = "صيد مفتوح · 15 قطعة") {
    const card = screen.getByRole("article", { name: label });
    await userEvent.click(within(card).getByRole("button"));
    return screen.getByRole("dialog", { hidden: true });
  }

  test("التأكيد ثم «شراء» يحوّل لصفحة الدفع الصحيحة", async () => {
    renderStore();

    const dialog = await openCheckout();

    expect(dialog).toHaveAttribute("open");
    expect(
      within(dialog).getByText("صيد مفتوح · 15 قطعة · 195 ر.س"),
    ).toBeInTheDocument();

    await userEvent.click(
      within(dialog).getByRole("button", { name: "شراء" }),
    );

    expect(assign).toHaveBeenCalledWith("https://raccon.rmz.gg/product/15open");
    expect(dialog).not.toHaveAttribute("open");
    expect(screen.getByText("جاري التحويل للدفع...")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("button", { name: /شراء ·/ })
        .every((button) => button.disabled),
    ).toBe(true);
  });

  test("«إلغاء» يقفل النافذة بدون تحويل", async () => {
    renderStore();

    const dialog = await openCheckout("تسلسلي · 6 قطعة");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "إلغاء" }),
    );

    expect(dialog).not.toHaveAttribute("open");
    expect(assign).not.toHaveBeenCalled();
  });

  test("الضغط على الخلفية يقفل النافذة", async () => {
    renderStore();

    const dialog = await openCheckout();
    await userEvent.click(dialog);

    expect(dialog).not.toHaveAttribute("open");
  });
});
