import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import ExperiencePackCard from "./ExperiencePackCard";

describe("بطاقة المتجر", () => {
  const renderStore = (props) =>
    render(<ExperiencePackCard variant="store" mode="open" pieces={15} price={195} {...props} />);

  test("الطريقة وعدد القطع وزر الشراء بالسعر", () => {
    renderStore({ onBuy: () => {} });

    const card = screen.getByRole("article", { name: "صيد مفتوح · 15 قطعة" });
    expect(card).toHaveClass("pack-card--open", "pack-card--store");
    expect(within(card).getByText("15")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveTextContent("اشترِ · 195 ر.س");
  });

  test("الضغط يستدعي onBuy", async () => {
    const onBuy = vi.fn();
    renderStore({ onBuy });

    await userEvent.click(screen.getByRole("button"));

    expect(onBuy).toHaveBeenCalledTimes(1);
  });

  test("بدون onBuy (معاينة صفحة الإنشاء): الزر معطّل", () => {
    renderStore();

    expect(screen.getByRole("button")).toBeDisabled();
  });

  test("أثناء التحويل: نص التحميل و aria-busy", () => {
    renderStore({ onBuy: () => {}, loading: true });

    expect(screen.getByRole("article")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button")).toHaveTextContent("جاري التحويل للدفع...");
    expect(screen.getByRole("button")).toBeDisabled();
  });

  test("disabled يعطّل الزر (بطاقة ثانية جاري تحويلها)", () => {
    renderStore({ onBuy: () => {}, disabled: true });

    expect(screen.getByRole("button")).toBeDisabled();
  });

  test("الطريقة الافتراضية تسلسلي، والسعر صفر «بدون سعر»", () => {
    render(<ExperiencePackCard variant="store" pieces={6} price={0} onBuy={() => {}} />);

    expect(screen.getByRole("article", { name: "تسلسلي · 6 قطعة" })).toHaveClass("pack-card--seq");
    expect(screen.getByRole("button")).toHaveTextContent("اشترِ · بدون سعر");
  });
});

describe("بطاقة الأدمن", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-17T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderAdmin = (props) =>
    render(
      <MemoryRouter>
        <ExperiencePackCard mode="sequential" pieces={10} price={130} {...props} />
      </MemoryRouter>,
    );

  test("الحالة والسعر وعدد القطع والطريقة", () => {
    renderAdmin({ title: "جولة", status: "sold" });

    expect(screen.getByText("مُباعة")).toBeInTheDocument();
    expect(screen.getByText("130")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("تسلسلي")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "جولة" })).toHaveClass("pack-card__sr");
  });

  test("حالة غير معروفة تظهر «متاحة»", () => {
    renderAdmin({ status: "weird" });

    expect(screen.getByText("متاحة")).toBeInTheDocument();
  });

  test.each([
    ["2026-11-17T08:00:00Z", "اليوم"],
    ["2026-11-16T12:00:00Z", "أمس"],
    ["2026-11-15T12:00:00Z", "قبل يومين"],
    ["2026-11-12T12:00:00Z", "قبل 5 أيام"],
    ["2026-11-08T12:00:00Z", "قبل أسبوع"],
    ["2026-10-27T12:00:00Z", "قبل 3 أسابيع"],
    ["2026-10-10T12:00:00Z", "قبل شهر"],
    ["2026-07-17T12:00:00Z", "قبل 4 أشهر"],
  ])("آخر تعديل %s → %s", (updatedAt, label) => {
    renderAdmin({ updatedAt });

    expect(screen.getByText(`آخر تعديل ${label}`)).toBeInTheDocument();
  });

  // \s? لأن jsdom يحذف المسافة قبل «» في الاسم؛ المتصفح يحتفظ فيها
  test("رابط التعديل: «كمّل» للمسودة و«تعديل» لغيرها", () => {
    const { unmount } = renderAdmin({ title: "جولة", status: "draft", editTo: "/admin/x" });
    expect(screen.getByRole("link", { name: /^كمّل\s?«جولة»$/ })).toHaveAttribute("href", "/admin/x");
    unmount();

    renderAdmin({ title: "جولة", status: "published", editTo: "/admin/x" });
    expect(screen.getByRole("link", { name: /^تعديل\s?«جولة»$/ })).toBeInTheDocument();
  });

  test("بدون editTo ما فيه رابط، وزر ⋯ موجود", () => {
    renderAdmin({ title: "جولة" });

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "خيارات «جولة»" })).toBeEnabled();
  });

  test("الصيد المفتوح لونه مختلف", () => {
    const { container } = renderAdmin({ mode: "open" });

    expect(container.querySelector(".pack-card")).toHaveClass("pack-card--open", "pack-card--admin");
  });
});
