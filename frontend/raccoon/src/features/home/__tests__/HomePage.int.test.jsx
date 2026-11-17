import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { adminUser } from "../../../test/fixtures";
import { renderWithProviders } from "../../../test/renderWithProviders";
import HomePage from "../HomePage";

const hrefOf = (name) => screen.getByRole("link", { name }).getAttribute("href");

test("المستخدم: العنوان، المتجر، واختصارات طرق اللعب", async () => {
  renderWithProviders(<HomePage />, { route: "/home" });

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("حوّل أي مكانإلى مغامرة تفاعلية");
  expect(await screen.findByRole("heading", { name: "تجربة الكشتة" })).toBeInTheDocument();
  expect(hrefOf("تصفح المتجر")).toBe("/store");
  expect(hrefOf(/التجربة التسلسلية المنظمة/)).toBe("/store");
  expect(hrefOf(/استكشاف حر/)).toBe("/store");
});

test("الأدمن: إنشاء تجربة وإدارة التجارب", async () => {
  server.use(http.get(`${API}/users/me`, () => HttpResponse.json(adminUser)));
  renderWithProviders(<HomePage />, { route: "/home" });

  expect(await screen.findByRole("heading", { name: "إنشاء تجربة جديدة" })).toBeInTheDocument();
  expect(hrefOf(/^انشئ/)).toBe("/admin/experiences/new");
  expect(hrefOf(/^تصفح$/)).toBe("/admin/experiences");
  expect(screen.getByText("إدارة المستخدمين والصلاحيات")).toBeInTheDocument();
});
