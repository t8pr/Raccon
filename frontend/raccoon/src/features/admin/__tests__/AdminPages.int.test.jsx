import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { adminUser } from "../../../test/fixtures";
import { renderWithProviders } from "../../../test/renderWithProviders";
import AdminRoute from "../../../shared/auth/AdminRoute";
import AdminExperiencesPage from "../AdminExperiencesPage";
import CreateExperiencePage from "../CreateExperiencePage";

beforeEach(() => {
  server.use(http.get(`${API}/users/me`, () => HttpResponse.json(adminUser)));
});

function renderAdmin(route = "/admin/experiences") {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/experiences" element={<AdminRoute><AdminExperiencesPage /></AdminRoute>} />
      <Route path="/admin/experiences/new" element={<AdminRoute><CreateExperiencePage /></AdminRoute>} />
      <Route path="/home" element={<p>الرئيسية</p>} />
    </Routes>,
    { route },
  );
}

// صفحة من الخادم بنفس شكل fastapi-pagination
function pageOf(items, { page = 1, size = 9, total = items.length } = {}) {
  return { items, total, page, size, pages: Math.ceil(total / size) };
}

const pack = (id, mode, tags_count, owner_id = null) => ({ id, mode, tags_count, owner_id });

function mockPacks(response) {
  const queries = [];
  server.use(
    http.get(`${API}/admin/packs`, ({ request }) => {
      const url = new URL(request.url);
      queries.push({ page: url.searchParams.get("page"), size: url.searchParams.get("size") });
      return typeof response === "function" ? response(url) : HttpResponse.json(response);
    }),
  );
  return queries;
}

describe("إدارة التجارب", () => {
  test("مستخدم عادي يرجع للرئيسية", async () => {
    server.use(http.get(`${API}/users/me`, () => HttpResponse.json({ ...adminUser, role: "user" })));
    renderAdmin();

    expect(await screen.findByText("الرئيسية")).toBeInTheDocument();
  });

  test("يعرض التجارب بالحالة والسعر من قائمة الأسعار", async () => {
    const queries = mockPacks(pageOf([pack(1, "seq", 10), pack(2, "open", 21, 7)]));
    renderAdmin();

    expect(await screen.findByText(/كل التجارب اللي انتجت — 2 تجربة/)).toBeInTheDocument();
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("متاحة");
    expect(cards[0]).toHaveTextContent("130");
    expect(cards[1]).toHaveTextContent("مُباعة");
    expect(queries[0]).toEqual({ page: "1", size: "9" });
    expect(screen.getByText("عرض 1–2 من 2 تجربة")).toBeInTheDocument();
  });

  test("الفلاتر والترتيب على الصفحة الحالية", async () => {
    mockPacks(pageOf([pack(1, "seq", 10), pack(2, "open", 21, 7), pack(3, "open", 6)]));
    renderAdmin();
    await screen.findAllByRole("article");

    await userEvent.click(screen.getByRole("button", { name: "صيد مفتوح" }));
    expect(screen.getAllByRole("article")).toHaveLength(2);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "حالة التجربة" }), "available");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("1 نتيجة في هالصفحة")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "حالة التجربة" }), "sold");
    await userEvent.click(screen.getByRole("button", { name: "تسلسلي" }));
    expect(screen.getByText("ما فيه تجارب بهالفلاتر في هالصفحة.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "امسح الفلاتر" }));
    expect(screen.getAllByRole("article")).toHaveLength(3);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "ترتيب الباكجات" }), "pieces-desc");
    expect(screen.getAllByRole("article")[0]).toHaveTextContent("21");
  });

  test("التنقل بين الصفحات يطلب الصفحة الجديدة", async () => {
    const queries = mockPacks((url) => {
      const page = Number(url.searchParams.get("page"));
      return HttpResponse.json(pageOf([pack(page * 10, "seq", 6)], { page, total: 30 }));
    });
    renderAdmin();

    const pages = await screen.findByRole("navigation", { name: "الصفحات" });
    expect(within(pages).getByRole("button", { name: "صفحة 1" })).toHaveAttribute("aria-current", "page");
    expect(within(pages).getByRole("button", { name: /السابق/ })).toBeDisabled();

    await userEvent.click(within(pages).getByRole("button", { name: "صفحة 4" }));

    // 30 تجربة ÷ 9 بالصفحة = 4 صفحات، والأخيرة فيها 3
    expect(await screen.findByText("عرض 28–30 من 30 تجربة")).toBeInTheDocument();
    expect(queries.at(-1)).toEqual({ page: "4", size: "9" });
    expect(within(pages).getByRole("button", { name: /التالي/ })).toBeDisabled();
  });

  test("ما فيه تجارب", async () => {
    mockPacks(pageOf([]));
    renderAdmin();

    expect(await screen.findByText("ما فيه تجارب للحين.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "أنشئ أول تجربة" })).toHaveAttribute("href", "/admin/experiences/new");
  });

  test("أثناء التحميل", async () => {
    mockPacks(async () => delay("infinite"));
    renderAdmin();

    expect(await screen.findByText("جاري تحميل التجارب...")).toBeInTheDocument();
  });

  test.each([
    [403, "هذي الصفحة للمشرفين بس."],
    [500, "تعذر تحميل التجارب. تأكد إن الباك إند شغّال وحاول مرة ثانية."],
  ])("خطأ %i", async (status, message) => {
    mockPacks(() => HttpResponse.json({}, { status }));
    renderAdmin();

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("button", { name: "حاول مرة ثانية" })).toBeInTheDocument();
  });
});

describe("إنشاء تجربة", () => {
  test("الاختيارات تغيّر المعاينة، والإنشاء يرجع للقائمة برسالة نجاح", async () => {
    let body;
    server.use(
      http.post(`${API}/admin/generate-packs`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(Array.from({ length: body.quantity }, (_, i) => ({ pack_id: i })));
      }),
    );
    mockPacks(pageOf([pack(1, "open", 15)]));
    renderAdmin("/admin/experiences/new");

    await screen.findByRole("heading", { name: "إنشاء تجربة جديدة", level: 1 });
    expect(screen.getByText("المعاينة: تسلسلي، 6 قطع، 79 ريال.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: /صيد مفتوح/ }));
    await userEvent.click(screen.getByRole("radio", { name: /15 قطعة/ }));
    await userEvent.click(screen.getByRole("button", { name: "زيادة" }));
    await userEvent.click(screen.getByRole("button", { name: "زيادة" }));

    expect(screen.getByText("المعاينة: صيد مفتوح، 15 قطعة، 195 ريال.")).toBeInTheDocument();
    expect(screen.getByLabelText(/عدد التجارب/)).toHaveValue(5);

    await userEvent.click(screen.getByRole("button", { name: "أنشئ التجربة" }));

    expect(await screen.findByText("انشأت 5 تجارب (صيد مفتوح · 15 قطعة).")).toBeInTheDocument();
    expect(body).toEqual({ mode: "open", tags_count: 15, quantity: 5 });
  });

  test("العدد بين 3 و 30", async () => {
    renderAdmin("/admin/experiences/new");
    await screen.findByRole("heading", { name: "إنشاء تجربة جديدة", level: 1 });

    expect(screen.getByRole("button", { name: "إنقاص" })).toBeDisabled();

    const quantity = screen.getByLabelText(/عدد التجارب/);
    await userEvent.clear(quantity);
    await userEvent.type(quantity, "99");
    expect(quantity).toHaveValue(30);
    expect(screen.getByRole("button", { name: "زيادة" })).toBeDisabled();
  });

  test.each([
    [403, "ما عندك صلاحية تنشئ تجارب. لازم يكون حسابك مشرف."],
    [422, "فيه بيانات ناقصة أو غلط. راجع الاختيارات وجرّب مرة ثانية."],
    [500, "تعذر إنشاء التجربة. تأكد إن الباك إند شغّال وحاول مرة ثانية."],
  ])("خطأ %i", async (status, message) => {
    server.use(http.post(`${API}/admin/generate-packs`, () => HttpResponse.json({}, { status })));
    renderAdmin("/admin/experiences/new");
    await screen.findByRole("heading", { name: "إنشاء تجربة جديدة", level: 1 });

    await userEvent.click(screen.getByRole("button", { name: "أنشئ التجربة" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });

  test("إلغاء بدون تغييرات يرجع مباشرة", async () => {
    mockPacks(pageOf([]));
    const { location } = renderAdmin("/admin/experiences/new");
    await screen.findByRole("heading", { name: "إنشاء تجربة جديدة", level: 1 });

    await userEvent.click(screen.getAllByRole("button", { name: "إلغاء" })[0]);

    expect(location.current.pathname).toBe("/admin/experiences");
  });

  test("إلغاء مع تغييرات يسأل أول", async () => {
    mockPacks(pageOf([]));
    const { location } = renderAdmin("/admin/experiences/new");
    await screen.findByRole("heading", { name: "إنشاء تجربة جديدة", level: 1 });

    await userEvent.click(screen.getByRole("radio", { name: /صيد مفتوح/ }));
    await userEvent.click(screen.getAllByRole("button", { name: "إلغاء" })[0]);

    const dialog = screen.getByRole("dialog", { name: "متأكد تبي تطلع؟" });
    expect(dialog).toHaveAttribute("open");

    await userEvent.click(within(dialog).getByRole("button", { name: "كمّل التعديل" }));
    expect(dialog).not.toHaveAttribute("open");
    expect(location.current.pathname).toBe("/admin/experiences/new");

    await userEvent.click(screen.getAllByRole("button", { name: "إلغاء" })[0]);
    await userEvent.click(within(dialog).getByRole("button", { name: "اطلع بدون حفظ" }));
    expect(location.current.pathname).toBe("/admin/experiences");
  });
});
