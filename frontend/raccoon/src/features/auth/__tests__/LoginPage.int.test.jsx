import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { testUser } from "../../../test/fixtures";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { getToken } from "../../../shared/auth/tokenStore";
import { rememberClaimReturn } from "../../../shared/utils/claimReturn";
import LoginPage from "../LoginPage";

// الحركة زخرفة وتحمّل ملف من public؛ ما لها دخل في الدخول
vi.mock("../components/HeroScanAnimation", () => ({ default: () => null }));

function renderLogin(route = "/login", options = {}) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/home" element={<p>الرئيسية</p>} />
      <Route path="/scan" element={<p>المسح</p>} />
      <Route path="/register" element={<p>صفحة التسجيل</p>} />
      <Route path="/claim/:hash" element={<p>صفحة الربط</p>} />
    </Routes>,
    { token: null, route, ...options },
  );
}

// يسجل ما وصل للخادم: جسم الدخول، والتوكن اللي انطلب فيه الحساب
function mockLogin(
  response = () => HttpResponse.json({ access_token: "new-token" }),
) {
  const seen = {};
  server.use(
    http.post(`${API}/auth/login`, async ({ request }) => {
      seen.type = request.headers.get("content-type");
      seen.body = Object.fromEntries(new URLSearchParams(await request.text()));
      return response();
    }),
    http.get(`${API}/users/me`, ({ request }) => {
      seen.meAuth = request.headers.get("authorization");
      return HttpResponse.json(testUser);
    }),
  );
  return seen;
}

async function fillAndSubmit(identifier = "abdu", password = "secret123") {
  await userEvent.type(
    screen.getByLabelText("اسم المستخدم أو الإيميل"),
    identifier,
  );
  await userEvent.type(screen.getByLabelText("كلمة المرور"), password);
  await userEvent.click(screen.getByRole("button", { name: "ادخل" }));
}

test("دخول ناجح: نموذج form-encoded، يحفظ التوكن، ويروح للرئيسية", async () => {
  const seen = mockLogin();
  const { location } = renderLogin();

  await fillAndSubmit();

  expect(await screen.findByText("الرئيسية")).toBeInTheDocument();
  expect(seen.type).toBe("application/x-www-form-urlencoded");
  expect(seen.body).toEqual({
    username: "abdu",
    password: "secret123",
    grant_type: "password",
  });
  expect(seen.meAuth).toBe("Bearer new-token");
  expect(getToken()).toBe("new-token");
  expect(location.current.pathname).toBe("/home");
});

test("زر الدخول معطّل حتى تكتمل البيانات", async () => {
  renderLogin();

  const submit = screen.getByRole("button", { name: "ادخل" });
  expect(submit).toBeDisabled();

  await userEvent.type(
    screen.getByLabelText("اسم المستخدم أو الإيميل"),
    "abdu",
  );
  await userEvent.type(screen.getByLabelText("كلمة المرور"), "short");
  expect(submit).toBeDisabled();

  await userEvent.type(screen.getByLabelText("كلمة المرور"), "123");
  expect(submit).toBeEnabled();
});

describe("أخطاء الخادم", () => {
  test.each([
    [401, "اسم المستخدم/البريد أو كلمة المرور غير صحيحة."],
    [400, "اسم المستخدم/البريد أو كلمة المرور غير صحيحة."],
    [422, "يرجى التأكد من البيانات المدخلة."],
    [500, "تعذر تسجيل الدخول. حاول مرة أخرى."],
  ])("%i", async (status, message) => {
    mockLogin(() => HttpResponse.json({}, { status }));
    renderLogin();

    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(getToken()).toBeNull();
  });

  test("رد بدون توكن يعتبر فشل", async () => {
    mockLogin(() => HttpResponse.json({ access_token: "  " }));
    renderLogin();

    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "تعذر تسجيل الدخول. حاول مرة أخرى.",
    );
  });

  test("التعديل بعد الخطأ يمسح الرسالة", async () => {
    mockLogin(() => HttpResponse.json({}, { status: 401 }));
    renderLogin();
    await fillAndSubmit();
    await screen.findByRole("alert");

    await userEvent.type(screen.getByLabelText("كلمة المرور"), "x");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
// كان خطأ: goAfterSignIn يتنادى مرتين بعد الدخول (من signInWith ومن useEffect)،
// والمرة الثانية تلقى رابط الربط انقرى وانمسح فتروح لـ /home. الحين يتنقل مرة وحدة بس.
test("زائر جاي من رابط ربط يرجع لصفحة الربط بعد الدخول", async () => {
  mockLogin();
  rememberClaimReturn("/claim/abc_1");
  const { location } = renderLogin();

  await fillAndSubmit();

  expect(
    await screen.findByText("صفحة الربط", {}, { timeout: 500 }),
  ).toBeInTheDocument();
  expect(location.current.pathname).toBe("/claim/abc_1");
});

describe("جاي من مسح قطعة (redirect_tag)", () => {
  test("يعرض «حصلتها!» والنموذج مباشرة، وبعد الدخول يرجع للمسح بالـhash", async () => {
    mockLogin();
    const { location } = renderLogin("/login?redirect_tag=tag42");

    expect(
      screen.getByRole("heading", { name: "حصلتها!" }),
    ).toBeInTheDocument();
    await fillAndSubmit();

    expect(await screen.findByText("المسح")).toBeInTheDocument();
    expect(location.current.search).toBe(
      `?tag=tag42&sig=${testUser.user_hash}`,
    );
  });

  test("التوقيع في الرابط يغلب hash الحساب", async () => {
    mockLogin();
    const { location } = renderLogin(
      "/login?redirect_tag=tag42&redirect_sig=sig9",
    );

    await fillAndSubmit();

    await screen.findByText("المسح");
    expect(location.current.search).toBe("?tag=tag42&sig=sig9");
  });

  test("زر «إنشاء حساب» في الشريط يحمل القطعة للتسجيل", async () => {
    const { location } = renderLogin(
      "/login?redirect_tag=tag42&redirect_sig=sig9",
    );

    await userEvent.click(screen.getByRole("link", { name: "إنشاء حساب" }));

    expect(location.current.pathname).toBe("/register");
    expect(location.current.search).toBe(
      "?redirect_tag=tag42&redirect_sig=sig9",
    );
  });
});

test("مستخدم داخل أصلًا يتحوّل للرئيسية", async () => {
  renderLogin("/login", { token: "test-token" });

  expect(await screen.findByText("الرئيسية")).toBeInTheDocument();
});

test("بعد تغيير كلمة المرور تظهر رسالة نجاح", () => {
  renderLogin({ pathname: "/login", state: { passwordReset: true } });

  expect(screen.getByRole("status")).toHaveTextContent(
    "تم تغيير كلمة المرور. ادخل بكلمة المرور الجديدة.",
  );
});

test("رابط «نسيت كلمة المرور؟» وزر «إنشاء حساب» في الشريط", () => {
  renderLogin();

  expect(
    screen.getByRole("link", { name: "نسيت كلمة المرور؟" }),
  ).toHaveAttribute("href", "/forgot-password");
  expect(screen.getByRole("link", { name: "إنشاء حساب" })).toHaveAttribute(
    "href",
    "/register",
  );
  expect(screen.getByRole("link", { name: "تسجيل الدخول" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

// كان خطأ: خطأ كلمة المرور يعتمد على touched.identifier بدل touched.password
test("ترك حقل كلمة المرور قصير يطلع خطأه", async () => {
  renderLogin();

  await userEvent.type(screen.getByLabelText("كلمة المرور"), "123");
  await userEvent.tab();

  await waitFor(
    () => expect(screen.getByText("أدخل 8 أحرف أو اكثر")).toBeInTheDocument(),
    {
      timeout: 300,
    },
  );
});
