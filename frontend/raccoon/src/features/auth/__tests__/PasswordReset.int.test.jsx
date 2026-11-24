import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { testUser } from "../../../test/fixtures";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { getToken } from "../../../shared/auth/tokenStore";
import { rememberClaimReturn } from "../../../shared/utils/claimReturn";
import RegisterPage from "../RegisterPage";

vi.mock("../components/HeroScanAnimation", () => ({ default: () => null }));

// RegisterPage يطبع تفاصيل خطأ الخادم في الكونسول؛ نسكته عشان ما يزحم النتيجة
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

function renderRegister() {
  return renderWithProviders(
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<p>صفحة الدخول</p>} />
      <Route path="/claim/:hash" element={<p>صفحة الربط</p>} />
    </Routes>,
    { token: null, route: "/register" },
  );
}

test("مستخدم داخل (فيه توكن) يفتح التسجيل: يروح للرئيسية", async () => {
  const { location } = renderWithProviders(
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/home" element={<p>الرئيسية</p>} />
    </Routes>,
    { route: "/register" },
  );

  expect(await screen.findByText("الرئيسية")).toBeInTheDocument();
  expect(location.current.pathname).toBe("/home");
});

// يفتح التسجيل وهو جاي من مسح قطعة (ProtectedRoute → الدخول → زر «إنشاء حساب»)
function renderRegisterFromScan(search) {
  return renderWithProviders(
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/scan" element={<p>صفحة المسح</p>} />
      <Route path="/home" element={<p>الرئيسية</p>} />
    </Routes>,
    { token: null, route: `/register${search}` },
  );
}

const valid = {
  الاسم: "عبدالرحمن",
  "اسم المستخدم": "abdu",
  الإيميل: "abdu@example.com",
  "رقم الجوال": "512345678",
  "كلمة المرور": "secret123",
  "تأكيد كلمة المرور": "secret123",
};

async function fillForm(values = valid) {
  for (const [label, value] of Object.entries(values)) {
    await userEvent.type(screen.getByLabelText(label), value);
  }
}

const submit = () =>
  userEvent.click(screen.getByRole("button", { name: "أنشئ حسابي" }));

// تسجيل ثم دخول تلقائي
function mockRegister({
  register = () => HttpResponse.json({ id: 7 }, { status: 201 }),
  login,
} = {}) {
  const seen = {};
  server.use(
    http.post(`${API}/auth/register`, async ({ request }) => {
      seen.register = await request.json();
      return register();
    }),
    http.post(`${API}/auth/login`, async ({ request }) => {
      seen.login = Object.fromEntries(
        new URLSearchParams(await request.text()),
      );
      return login ? login() : HttpResponse.json({ access_token: "new-token" });
    }),
  );
  return seen;
}

test("تسجيل ناجح: يرسل البيانات بدون التأكيد، يدخل تلقائيًا، ويرحّب", async () => {
  const seen = mockRegister();
  renderRegister();

  await fillForm();
  await submit();

  expect(
    await screen.findByRole("heading", { name: "هلا عبدالرحمن!" }),
  ).toBeInTheDocument();
  expect(
    await screen.findByText("خلاص، حسابك جاهز وأنت داخل"),
  ).toBeInTheDocument();
  expect(seen.register).toEqual({
    name: "عبدالرحمن",
    username: "abdu",
    email: "abdu@example.com",
    phone_number: "512345678",
    password: "secret123",
    avatar_id: 1,
  });
  expect(seen.login).toMatchObject({ username: "abdu", password: "secret123" });
  expect(getToken()).toBe("new-token");
});

test("الزر معطّل حتى تكتمل البيانات، وعدم التطابق يظهر تحت التأكيد", async () => {
  renderRegister();
  expect(screen.getByRole("button", { name: "أنشئ حسابي" })).toBeDisabled();

  await fillForm({ ...valid, "تأكيد كلمة المرور": "other1234" });

  expect(screen.getByRole("button", { name: "أنشئ حسابي" })).toBeDisabled();
  expect(screen.getByText("كلمتا المرور غير متطابقتين.")).toBeInTheDocument();
});

test("الخطأ يظهر بعد مغادرة الحقل", async () => {
  renderRegister();

  await userEvent.type(screen.getByLabelText("اسم المستخدم"), "AB");
  await userEvent.tab();

  expect(screen.getByLabelText("اسم المستخدم")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

describe("أخطاء الخادم", () => {
  test("400: اسم المستخدم أو البريد مستخدم", async () => {
    mockRegister({
      register: () => HttpResponse.json({ detail: "exists" }, { status: 400 }),
    });
    renderRegister();

    await fillForm();
    await submit();

    expect(
      await screen.findByText(
        "اسم المستخدم أو البريد الإلكتروني مستخدم مسبقًا",
      ),
    ).toBeInTheDocument();
  });

  test("422 بقائمة حقول: الخطأ تحت الحقل نفسه", async () => {
    mockRegister({
      register: () =>
        HttpResponse.json(
          { detail: [{ loc: ["body", "username"], msg: "bad" }] },
          { status: 422 },
        ),
    });
    renderRegister();

    await fillForm();
    await submit();

    expect(
      await screen.findByText("تحقق من قيمة هذا الحقل"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("اسم المستخدم")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("422 نصي: خطأ البريد", async () => {
    mockRegister({
      register: () =>
        HttpResponse.json({ detail: "bad email" }, { status: 422 }),
    });
    renderRegister();

    await fillForm();
    await submit();

    expect(
      await screen.findByText("تعذر التحقق من البريد الإلكتروني."),
    ).toBeInTheDocument();
  });

  test("422 بحقول غير معروفة: رسالة عامة", async () => {
    mockRegister({
      register: () =>
        HttpResponse.json(
          { detail: [{ loc: ["body", "x"] }] },
          { status: 422 },
        ),
    });
    renderRegister();

    await fillForm();
    await submit();

    expect(
      await screen.findByText("يرجى مراجعة البيانات المدخلة"),
    ).toBeInTheDocument();
  });

  test("الخادم طايح", async () => {
    mockRegister({ register: () => HttpResponse.json({}, { status: 500 }) });
    renderRegister();

    await fillForm();
    await submit();

    expect(
      await screen.findByText(
        "تعذر الاتصال بالخادم أو إكمال التسجيل. حاول مرة أخرى",
      ),
    ).toBeInTheDocument();
  });
});

test("الحساب انشأ لكن الدخول التلقائي فشل: زر تسجيل الدخول", async () => {
  mockRegister({ login: () => HttpResponse.json({}, { status: 500 }) });
  const { location } = renderRegister();

  await fillForm();
  await submit();

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "تم إنشاء حسابك، لكن تعذر الدخول تلقائيًا.",
  );
  await userEvent.click(screen.getByRole("button", { name: "تسجيل الدخول" }));
  expect(location.current.pathname).toBe("/login");
});

test("زائر جاي من رابط ربط: يرجع لصفحة الربط بعد التسجيل", async () => {
  mockRegister();
  rememberClaimReturn("/claim/abc_1");
  const { location } = renderRegister();

  await fillForm();
  await submit();

  expect(await screen.findByText("صفحة الربط")).toBeInTheDocument();
  expect(location.current.pathname).toBe("/claim/abc_1");
});

test("زر Google معطّل (قريبًا)", () => {
  renderRegister();

  expect(screen.getByRole("button", { name: /Google/ })).toBeDisabled();
});

test("الحساب المسجّل يستخدم بيانات المستخدم من الخادم", async () => {
  mockRegister();
  const { queryClient } = renderRegister();

  await fillForm();
  await submit();
  await screen.findByText("خلاص، حسابك جاهز وأنت داخل");

  expect(queryClient.getQueryData(["profile", "new-token"])).toEqual(testUser);
});

describe("جاي من مسح قطعة", () => {
  test("التسجيل بكلمة مرور يرجّعه لصفحة المسح عشان تنحسب القطعة", async () => {
    mockRegister();
    const { location } = renderRegisterFromScan(
      "?redirect_tag=abc&redirect_sig=xyz",
    );

    await fillForm();
    await submit();

    expect(await screen.findByText("صفحة المسح")).toBeInTheDocument();
    expect(location.current.pathname).toBe("/scan");
    expect(location.current.search).toBe("?tag=abc&sig=xyz");
  });

  test("بدون sig في الرابط: ياخذ user_hash حق الحساب", async () => {
    mockRegister();
    const { location } = renderRegisterFromScan("?redirect_tag=abc");

    await fillForm();
    await submit();

    expect(await screen.findByText("صفحة المسح")).toBeInTheDocument();
    expect(location.current.search).toBe(
      `?${new URLSearchParams({ tag: "abc", sig: testUser.user_hash })}`,
    );
  });
});
