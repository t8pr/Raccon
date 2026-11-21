import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { describe, expect, test, vi } from "vitest";

import { server } from "../test/server";
import { API } from "../test/handlers";
import { adminUser } from "../test/fixtures";
import { setToken } from "../shared/auth/tokenStore";
import App from "./App";

vi.mock("../features/auth/components/HeroScanAnimation", () => ({
  default: () => null,
}));

// App فيه BrowserRouter حقيقي، فنغيّر رابط المتصفح قبل الرسم
function openApp(path, { token = "test-token" } = {}) {
  window.history.pushState({}, "", path);
  if (token) setToken(token);

  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <App />
    </QueryClientProvider>,
  );
}

describe("المسارات", () => {
  test("/ يحوّل للتسجيل", async () => {
    openApp("/", { token: null });

    // the title is there twice in the DOM (phone header + form); CSS shows one of them
    expect(
      (await screen.findAllByRole("heading", { name: "أنشئ حسابك" })).length,
    ).toBeGreaterThan(0);
    expect(window.location.pathname).toBe("/register");
  });

  test.each([
    ["/login", "هلا، حياك من جديد"],
    ["/forgot-password", "نسيت كلمة المرور؟"],
  ])("%s عام", async (path, heading) => {
    openApp(path, { token: null });

    // صفحات الدخول فيها عنوان للجوال وعنوان للنموذج
    expect(
      (await screen.findAllByRole("heading", { name: heading, level: 1 }))
        .length,
    ).toBeGreaterThan(0);
  });

  test("المتجر عام للزائر", async () => {
    openApp("/store", { token: null });

    expect(
      await screen.findByRole("heading", { name: "المتجر" }),
    ).toBeInTheDocument();
  });

  test("رابط مسح لزائر: يطلب الدخول ويحفظ القطعة", async () => {
    openApp("/scan?tag=x&sig=y", { token: null });

    expect(
      await screen.findByRole("heading", { name: "هلا، حياك من جديد" }),
    ).toBeInTheDocument();
    expect(window.location.search).toBe("?redirect_tag=x&redirect_sig=y");
  });

  test.each(["/home", "/profile", "/packages", "/customization/e1"])(
    "%s محمي: الزائر يروح للدخول",
    async (path) => {
      openApp(path, { token: null });

      expect(
        await screen.findByRole("heading", { name: "هلا، حياك من جديد" }),
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe("/login");
    },
  );

  test("مستخدم داخل يشوف الرئيسية", async () => {
    openApp("/home");

    expect(
      await screen.findByRole("heading", { name: "تجربة الكشتة" }),
    ).toBeInTheDocument();
  });

  test("صفحات الأدمن: المستخدم العادي يرجع للرئيسية", async () => {
    openApp("/admin/experiences");

    expect(
      await screen.findByRole("heading", { name: "تجربة الكشتة" }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe("/home");
  });

  test("صفحات الأدمن: الأدمن يدخل", async () => {
    server.use(
      http.get(`${API}/users/me`, () => HttpResponse.json(adminUser)),
      http.get(`${API}/admin/packs`, () =>
        HttpResponse.json({ items: [], total: 0, page: 1, size: 9, pages: 0 }),
      ),
    );
    openApp("/admin/experiences/new");

    expect(
      await screen.findByRole("heading", {
        name: "إنشاء تجربة جديدة",
        level: 1,
      }),
    ).toBeInTheDocument();
  });

  test("صفحات الدخول بدون main-content، والباقي معه", async () => {
    openApp("/login", { token: null });
    await screen.findByRole("heading", { name: "هلا، حياك من جديد" });

    expect(document.querySelector("main.main-content")).toBeNull();
  });
});
