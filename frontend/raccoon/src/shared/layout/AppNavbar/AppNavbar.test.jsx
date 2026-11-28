import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { describe, expect, test } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { adminUser } from "../../../test/fixtures";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { getToken } from "../../auth/tokenStore";
import AppNavbar from "./AppNavbar";

function renderNavbar({ route = "/home", title } = {}) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<p>صفحة الدخول</p>} />
      <Route path="*" element={<AppNavbar title={title} />} />
    </Routes>,
    { route },
  );
}

const linkNames = () =>
  within(screen.getByRole("navigation", { name: "التنقل الرئيسي" }))
    .getAllByRole("link")
    .map((link) => link.textContent);

describe("الروابط حسب الدور", () => {
  test("المستخدم", async () => {
    renderNavbar();

    await screen.findByRole("button", { name: "قائمة الحساب" });
    expect(linkNames()).toEqual(["الرئيسية", "التجارب", "المتجر"]);
  });

  test("الأدمن يرى رابط إدارة المستخدمين", async () => {
    server.use(http.get(`${API}/users/me`, () => HttpResponse.json(adminUser)));
    renderNavbar();

    const usersLink = await screen.findByRole("link", { name: "إدارة المستخدمين" });

    expect(linkNames()).toEqual([
      "الرئيسية",
      "التجارب",
      "المتجر",
      "إدارة التجارب",
      "إدارة المستخدمين",
    ]);
    expect(usersLink).toHaveAttribute("href", "/admin/users");
    expect(usersLink).not.toHaveAttribute("aria-disabled", "true");
  });

  test("الصفحة الحالية مميزة", async () => {
    renderNavbar({ route: "/store" });

    expect(await screen.findByRole("link", { name: "المتجر" })).toHaveClass("rac-navbar__link--active");
    expect(screen.getByRole("link", { name: "الرئيسية" })).not.toHaveClass("rac-navbar__link--active");
  });
});

test("title يظهر بدل الروابط (شاشات المسح)", () => {
  renderNavbar({ title: "جولة راكون" });

  expect(screen.getByText("جولة راكون")).toBeInTheDocument();
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
});

test("الشعار يودي للرئيسية", () => {
  renderNavbar();

  expect(screen.getByRole("link", { name: "راكون — الرئيسية" })).toHaveAttribute("href", "/home");
});

describe("قائمة الحساب", () => {
  test("الاسم واسم المستخدم ورابط «حسابي»", async () => {
    renderNavbar();
    await screen.findByText("التجارب");

    await userEvent.click(await screen.findByRole("button", { name: "قائمة الحساب" }));

    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("عبدالرحمن")).toBeInTheDocument();
    expect(within(menu).getByText("@abdu")).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "حسابي" })).toHaveAttribute("href", "/profile");
  });

  test("تسجيل الخروج: يرسل الطلب ويمسح الجلسة ويروح للدخول", async () => {
    let loggedOut = false;
    server.use(
      http.post(`${API}/auth/logout`, () => {
        loggedOut = true;
        return HttpResponse.json({});
      }),
    );
    const { location } = renderNavbar();
    await screen.findByText("التجارب");

    await userEvent.click(screen.getByRole("button", { name: "قائمة الحساب" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "تسجيل الخروج" }));

    expect(await screen.findByText("صفحة الدخول")).toBeInTheDocument();
    expect(loggedOut).toBe(true);
    expect(getToken()).toBeNull();
    expect(location.current.pathname).toBe("/login");
  });

  test("فشل الخروج: رسالة والجلسة باقية", async () => {
    server.use(http.post(`${API}/auth/logout`, () => HttpResponse.json({}, { status: 500 })));
    renderNavbar();
    await screen.findByText("التجارب");

    await userEvent.click(screen.getByRole("button", { name: "قائمة الحساب" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "تسجيل الخروج" }));

    expect(await screen.findByText("تعذر تسجيل الخروج. حاول مرة أخرى.")).toBeInTheDocument();
    expect(getToken()).not.toBeNull();
  });

  // خطأ معروف (وصول): القائمة تبقى مفتوحة بعد فشل الخروج (onSelect فيه preventDefault)،
  // و Radix يخفي كل شي برا القائمة عن قارئ الشاشة، فرسالة الخطأ ما تنقرأ.
  // test.fails = يصف السلوك الصحيح ويُتوقع فشله حتى ينصلح. بعد الإصلاح احذف .fails
  test.fails("خطأ معروف: رسالة فشل الخروج توصل لقارئ الشاشة", async () => {
    server.use(http.post(`${API}/auth/logout`, () => HttpResponse.json({}, { status: 500 })));
    renderNavbar();
    await screen.findByText("التجارب");

    await userEvent.click(screen.getByRole("button", { name: "قائمة الحساب" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "تسجيل الخروج" }));

    expect(
      await screen.findByRole("alert", {}, { timeout: 500 }),
    ).toHaveTextContent("تعذر تسجيل الخروج. حاول مرة أخرى.");
  });
});
