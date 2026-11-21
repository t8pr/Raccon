import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { makePack, testUser } from "../../../test/fixtures";
import { renderWithProviders } from "../../../test/renderWithProviders";
import ClaimPage from "../ClaimPage";
import LoginPage from "../../auth/LoginPage";
import RegisterPage from "../../auth/RegisterPage";

/*
  رحلة رابط الاستلام كاملة، بصفحات الدخول والتسجيل الحقيقية:
    1. داخل      → يربط الباكج مباشرة
    2. مو داخل   → يختار «تسجيل الدخول» أو «إنشاء حساب»
    3. بعد الدخول أو التسجيل → يرجع لنفس صفحة الربط ويكمل منها
*/

// الحركة زخرفة وتحمّل ملف من public؛ ما لها دخل هنا
vi.mock("../../auth/components/HeroScanAnimation", () => ({
  default: () => null,
}));

beforeEach(() => {
  // RegisterPage يطبع أخطاء الخادم في الكونسول
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const HASH = "q8Zr_abc-1";

function renderJourney({ token = null } = {}) {
  return renderWithProviders(
    <Routes>
      <Route path="/claim/:masterAuthHash" element={<ClaimPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/home" element={<p>الرئيسية</p>} />
    </Routes>,
    { route: `/claim/${HASH}`, token },
  );
}

// باكج بلا مالك، والربط يرجّعه باسم المستخدم. يسجّل طلبات الربط.
function mockServer() {
  const claims = [];
  server.use(
    http.get(`${API}/packs/preview/:hash`, () => HttpResponse.json(makePack())),
    http.post(`${API}/packs/claim`, async ({ request }) => {
      claims.push(await request.json().catch(() => null));
      return HttpResponse.json(makePack({ owner_id: testUser.id }));
    }),
    http.get(`${API}/events`, () => HttpResponse.json([])),
    http.post(`${API}/auth/login`, () =>
      HttpResponse.json({ access_token: "new-token" }),
    ),
    http.post(`${API}/auth/register`, () =>
      HttpResponse.json({ id: testUser.id }, { status: 201 }),
    ),
  );
  return { claims };
}

const claimButton = () => screen.findByRole("button", { name: "اربطه بحسابي" });

async function linkPack() {
  await userEvent.click(await claimButton());
  expect(
    await screen.findByRole("heading", {
      name: "ألف مبروك، تم ربط الحزمة بك!",
    }),
  ).toBeInTheDocument();
}

test("1. داخل: يربط الباكج مباشرة بدون دخول", async () => {
  const { claims } = mockServer();
  const { location } = renderJourney({ token: "test-token" });

  await linkPack();

  expect(location.current.pathname).toBe(`/claim/${HASH}`);
  expect(claims).toHaveLength(1);
});

test("2. مو داخل: يطلع له «إنشاء حساب» و«تسجيل الدخول» بدل الربط", async () => {
  mockServer();
  renderJourney();

  expect(
    await screen.findByRole("button", { name: "إنشاء حساب" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "تسجيل الدخول" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "اربطه بحسابي" }),
  ).not.toBeInTheDocument();
});

describe("3. بعد الدخول أو التسجيل يرجع لصفحة الربط ويكمل", () => {
  test("تسجيل الدخول", async () => {
    const { claims } = mockServer();
    const { location } = renderJourney();

    await userEvent.click(
      await screen.findByRole("button", { name: "تسجيل الدخول" }),
    );
    expect(location.current.pathname).toBe("/login");

    await userEvent.type(
      screen.getByLabelText("اسم المستخدم أو الإيميل"),
      "abdu",
    );
    await userEvent.type(screen.getByLabelText("كلمة المرور"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "ادخل" }));

    // رجع لنفس الرابط، مو للرئيسية
    expect(await claimButton()).toBeInTheDocument();
    expect(location.current.pathname).toBe(`/claim/${HASH}`);

    await linkPack();
    expect(claims).toHaveLength(1);
  });

  test("إنشاء حساب جديد", async () => {
    const { claims } = mockServer();
    const { location } = renderJourney();

    await userEvent.click(
      await screen.findByRole("button", { name: "إنشاء حساب" }),
    );
    expect(location.current.pathname).toBe("/register");

    const fields = {
      الاسم: "عبدالرحمن",
      "اسم المستخدم": "abdu",
      الإيميل: "abdu@example.com",
      "رقم الجوال": "512345678",
      "كلمة المرور": "secret123",
      "تأكيد كلمة المرور": "secret123",
    };
    for (const [label, value] of Object.entries(fields)) {
      await userEvent.type(screen.getByLabelText(label), value);
    }
    await userEvent.click(screen.getByRole("button", { name: "أنشئ حسابي" }));

    expect(await claimButton()).toBeInTheDocument();
    expect(location.current.pathname).toBe(`/claim/${HASH}`);

    await linkPack();
    expect(claims).toHaveLength(1);
  });

  test("يبدّل من الدخول للتسجيل من الشريط، ويرجع للربط برضو", async () => {
    mockServer();
    const { location } = renderJourney();

    await userEvent.click(
      await screen.findByRole("button", { name: "تسجيل الدخول" }),
    );
    await userEvent.click(screen.getByRole("link", { name: "إنشاء حساب" }));
    expect(location.current.pathname).toBe("/register");

    for (const [label, value] of Object.entries({
      الاسم: "عبدالرحمن",
      "اسم المستخدم": "abdu",
      الإيميل: "abdu@example.com",
      "رقم الجوال": "512345678",
      "كلمة المرور": "secret123",
      "تأكيد كلمة المرور": "secret123",
    })) {
      await userEvent.type(screen.getByLabelText(label), value);
    }
    await userEvent.click(screen.getByRole("button", { name: "أنشئ حسابي" }));

    expect(await claimButton()).toBeInTheDocument();
    expect(location.current.pathname).toBe(`/claim/${HASH}`);
  });

  test("الدخول بدون رابط استلام محفوظ يروح للرئيسية عادي", async () => {
    mockServer();
    const { location } = renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={<p>الرئيسية</p>} />
      </Routes>,
      { route: "/login", token: null },
    );

    await userEvent.type(
      screen.getByLabelText("اسم المستخدم أو الإيميل"),
      "abdu",
    );
    await userEvent.type(screen.getByLabelText("كلمة المرور"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "ادخل" }));

    expect(await screen.findByText("الرئيسية")).toBeInTheDocument();
    expect(location.current.pathname).toBe("/home");
  });
});
