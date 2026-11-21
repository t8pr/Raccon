import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse, delay } from "msw";
import { Route, Routes } from "react-router-dom";
import { describe, expect, test } from "vitest";

import { server } from "../../test/server";
import { API } from "../../test/handlers";
import { adminUser } from "../../test/fixtures";
import { renderWithProviders } from "../../test/renderWithProviders";
import { getToken } from "./tokenStore";
import AdminRoute from "./AdminRoute";
import ProtectedRoute from "./ProtectedRoute";

function renderRoutes(route, options) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<p>صفحة الدخول</p>} />
      <Route path="/home" element={<ProtectedRoute><p>الرئيسية</p></ProtectedRoute>} />
      <Route path="/scan" element={<ProtectedRoute><p>المسح</p></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><p>لوحة الأدمن</p></AdminRoute>} />
    </Routes>,
    { route, ...options },
  );
}

describe("ProtectedRoute", () => {
  test("مستخدم داخل يشوف الصفحة", async () => {
    renderRoutes("/home");

    expect(await screen.findByText("الرئيسية")).toBeInTheDocument();
  });

  test("أثناء التحقق من الجلسة: «جاري التحميل...»", async () => {
    server.use(
      http.get(`${API}/users/me`, async () => {
        await delay("infinite");
      }),
    );

    renderRoutes("/home");

    expect(screen.getByRole("status")).toHaveTextContent("جاري التحميل...");
  });

  test("زائر يروح للدخول", async () => {
    const { location } = renderRoutes("/home", { token: null });

    expect(await screen.findByText("صفحة الدخول")).toBeInTheDocument();
    expect(location.current.pathname).toBe("/login");
  });

  test("رابط مسح لزائر يحفظ القطعة في رابط الدخول", async () => {
    const { location } = renderRoutes("/scan?tag=abc123", { token: null });

    await screen.findByText("صفحة الدخول");
    expect(location.current.search).toBe("?redirect_tag=abc123");
  });

  test("ومعه التوقيع لو موجود", async () => {
    const { location } = renderRoutes("/scan?tag=abc123&sig=s1", { token: null });

    await screen.findByText("صفحة الدخول");
    expect(location.current.search).toBe("?redirect_tag=abc123&redirect_sig=s1");
  });

  test("توكن منتهي (401): يمسح الجلسة ويروح للدخول", async () => {
    server.use(http.get(`${API}/users/me`, () => HttpResponse.json({}, { status: 401 })));

    renderRoutes("/home");

    expect(await screen.findByText("صفحة الدخول")).toBeInTheDocument();
    expect(getToken()).toBeNull();
  });

  test("الخادم طايح: رسالة وزر إعادة المحاولة، والتوكن يبقى", async () => {
    server.use(http.get(`${API}/users/me`, () => HttpResponse.json({}, { status: 500 })));

    renderRoutes("/home");

    expect(await screen.findByRole("alert")).toHaveTextContent("تعذر التحقق من جلسة الدخول. حاول مرة أخرى.");
    expect(screen.getByRole("button", { name: "إعادة المحاولة" })).toBeInTheDocument();
    expect(getToken()).not.toBeNull();
  });
});

describe("AdminRoute", () => {
  test("مستخدم عادي يرجع للرئيسية", async () => {
    const { location } = renderRoutes("/admin");

    expect(await screen.findByText("الرئيسية")).toBeInTheDocument();
    expect(location.current.pathname).toBe("/home");
  });

  test("الأدمن يشوف الصفحة", async () => {
    server.use(http.get(`${API}/users/me`, () => HttpResponse.json(adminUser)));

    renderRoutes("/admin");

    expect(await screen.findByText("لوحة الأدمن")).toBeInTheDocument();
  });

  test("زائر يروح للدخول", async () => {
    renderRoutes("/admin", { token: null });

    await waitFor(() => expect(screen.getByText("صفحة الدخول")).toBeInTheDocument());
  });
});
