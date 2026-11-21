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
  test("الطريقة + الحجم، ثم «امسح الفلاتر»", async () => {
    renderStore();

    expect(
      screen.queryByRole("button", { name: "امسح الفلاتر" }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "صيد مفتوح" }));
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "الحجم والسعر" }),
      "10",
    );

    expect(cards()).toEqual(["صيد مفتوح · 10 قطعة"]);

    await userEvent.click(screen.getByRole("button", { name: "امسح الفلاتر" }));
    expect(cards()).toHaveLength(8);
  });

  test("قائمة الحجم فيها الأسعار", () => {
    renderStore();

    const options = within(
      screen.getByRole("combobox", { name: "الحجم والسعر" }),
    ).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "الحجم والسعر: الكل",
      "6 قطعة · 79 ر.س",
      "10 قطعة · 130 ر.س",
      "15 قطعة · 195 ر.س",
      "21 قطعة · 273 ر.س",
    ]);
  });

  test("الترتيب من الأغلى", async () => {
    renderStore();

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "ترتيب الباكجات" }),
      "price-desc",
    );

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

  test("التأكيد ثم «اشترِ» يحوّل لصفحة الدفع الصحيحة", async () => {
    renderStore();

    const dialog = await openCheckout();

    expect(dialog).toHaveAttribute("open");
    expect(
      within(dialog).getByText("صيد مفتوح · 15 قطعة · 195 ر.س"),
    ).toBeInTheDocument();

    await userEvent.click(
      within(dialog).getByRole("button", { name: "اشترِ" }),
    );

    expect(assign).toHaveBeenCalledWith("https://raccon.rmz.gg/product/15open");
    expect(dialog).not.toHaveAttribute("open");
    expect(screen.getByText("جاري التحويل للدفع...")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("button", { name: /اشترِ ·/ })
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
