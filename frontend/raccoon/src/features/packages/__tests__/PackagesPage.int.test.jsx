import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import { Route, Routes } from "react-router-dom";
import { describe, expect, test } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { makeEvent } from "../../../test/fixtures";
import { renderWithProviders } from "../../../test/renderWithProviders";
import PackagesPage from "../PackagesPage";

function renderPackages(options) {
  return renderWithProviders(
    <Routes>
      <Route path="/packages" element={<PackagesPage />} />
      <Route path="/customization/:eventId" element={<p>صفحة التخصيص</p>} />
      <Route path="/login" element={<p>صفحة الدخول</p>} />
      <Route path="/store" element={<p>صفحة المتجر</p>} />
    </Routes>,
    { route: "/packages", ...options },
  );
}

const events = [
  makeEvent({ id: "e1", title: "مكتب", mode: "seq", tags_count: 10 }),
  makeEvent({ id: "e2", title: "Untitled Event", mode: "open", tags_count: 6 }),
  makeEvent({ id: "e3", title: "حديقة", mode: "open", tags_count: null }),
];

const cardTitles = () =>
  screen
    .getAllByRole("article")
    .map((card) => card.querySelector("h2").textContent);

test("يعرض الجولات كبطاقات بالاسم والطريقة وعدد القطع", async () => {
  server.use(http.get(`${API}/events`, () => HttpResponse.json(events)));
  renderPackages();

  expect(
    await screen.findByRole("article", { name: "مكتب" }),
  ).toHaveTextContent("تسلسلي");
  expect(cardTitles()).toEqual(["مكتب", "بدون اسم", "حديقة"]);
  expect(screen.getByRole("article", { name: "حديقة" })).toHaveTextContent("—");
});

describe("لون البطاقة حسب طريقة اللعب", () => {
  test.each([
    ["seq", "event-pack--seq", "تسلسلي"],
    ["open", "event-pack--open", "صيد مفتوح"],
    [null, "event-pack--unknown", "غير محدد"],
    ["weird", "event-pack--unknown", "غير محدد"],
  ])("%s", async (mode, tone, label) => {
    server.use(
      http.get(`${API}/events`, () =>
        HttpResponse.json([makeEvent({ title: "جولة", mode })]),
      ),
    );
    renderPackages();

    const card = await screen.findByRole("article", { name: "جولة" });
    expect(card).toHaveClass(tone);
    expect(card).toHaveTextContent(label);
  });
});

test("الفلتر حسب طريقة اللعب، وفلتر بلا نتائج", async () => {
  server.use(
    http.get(`${API}/events`, () => HttpResponse.json(events.slice(1))),
  );
  renderPackages();
  await screen.findByRole("article", { name: "حديقة" });

  await userEvent.click(screen.getByRole("button", { name: "تسلسلي" }));

  expect(screen.queryByRole("article")).not.toBeInTheDocument();
  expect(
    screen.getByText("لا توجد حزم مطابقة لهذا الفلتر."),
  ).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "صيد مفتوح" }));
  expect(cardTitles()).toEqual(["بدون اسم", "حديقة"]);
});

test("«تخصيص» يفتح صفحة الجولة", async () => {
  server.use(http.get(`${API}/events`, () => HttpResponse.json(events)));
  const { location } = renderPackages();

  await userEvent.click(
    await screen.findByRole("button", { name: "تخصيص حديقة" }),
  );

  expect(await screen.findByText("صفحة التخصيص")).toBeInTheDocument();
  expect(location.current.pathname).toBe("/customization/e3");
});

test("بدون جولات: دعوة للمتجر", async () => {
  server.use(http.get(`${API}/events`, () => HttpResponse.json([])));
  renderPackages();

  expect(
    await screen.findByText("لا توجد باقات مرتبطة بحسابك حاليًا."),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("group", { name: "طريقة اللعب" }),
  ).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "استكشف الحزم" }));
  expect(await screen.findByText("صفحة المتجر")).toBeInTheDocument();
});

test("أثناء التحميل", async () => {
  server.use(
    http.get(`${API}/events`, async () => {
      await delay("infinite");
    }),
  );
  renderPackages();

  expect(await screen.findByText("جارٍ تحميل باقاتك...")).toBeInTheDocument();
});

test("فشل الجلب ثم «إعادة المحاولة»", async () => {
  let attempts = 0;
  server.use(
    http.get(`${API}/events`, () => {
      attempts += 1;
      return attempts === 1
        ? HttpResponse.json({}, { status: 500 })
        : HttpResponse.json(events);
    }),
  );
  renderPackages();

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "تعذر تحميل باقاتك.",
  );
  await userEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));

  expect(
    await screen.findByRole("article", { name: "مكتب" }),
  ).toBeInTheDocument();
});

test("زائر: زر تسجيل الدخول", async () => {
  renderPackages({ token: null });

  expect(screen.getByText("سجّل دخولك لعرض باقاتك.")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "تسجيل الدخول" }));
  expect(await screen.findByText("صفحة الدخول")).toBeInTheDocument();
});
