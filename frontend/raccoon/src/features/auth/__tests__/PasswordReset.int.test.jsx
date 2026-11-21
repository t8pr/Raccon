import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import ForgotPasswordPage from "../ForgotPasswordPage";
import LoginPage from "../LoginPage";
import ResetPasswordPage from "../ResetPasswordPage";

vi.mock("../components/HeroScanAnimation", () => ({ default: () => null }));

function renderAuth(route) {
  return renderWithProviders(
    <Routes>
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>,
    { token: null, route },
  );
}

// رابط الإيميل JWT؛ الصفحة تقرأ الجزء الأوسط فقط (purpose و exp)
function resetToken(payload) {
  const base64url = (value) => btoa(JSON.stringify(value)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${base64url({ alg: "HS256" })}.${base64url(payload)}.signature`;
}

const inMinutes = (minutes) => Math.floor(Date.now() / 1000) + minutes * 60;

describe("نسيت كلمة المرور", () => {
  function mockForgot(response = () => HttpResponse.json({ ok: true })) {
    const bodies = [];
    server.use(
      http.post(`${API}/auth/forgot-password`, async ({ request }) => {
        bodies.push(await request.json());
        return response();
      }),
    );
    return bodies;
  }

  test("يرسل الرابط ويعرض «شيّك على بريدك» بدون ما يكشف وجود الحساب", async () => {
    const bodies = mockForgot();
    renderAuth("/forgot-password");

    await userEvent.type(screen.getByLabelText("البريد الإلكتروني"), "abdu@example.com");
    await userEvent.click(screen.getByRole("button", { name: "أرسل الرابط" }));

    expect(await screen.findByText(/إذا كان فيه حساب مسجّل بـ abdu@example.com/)).toBeInTheDocument();
    expect(screen.queryByLabelText("البريد الإلكتروني")).not.toBeInTheDocument();
    expect(bodies).toEqual([{ email: "abdu@example.com" }]);
  });

  test("«أرسل الرابط مرة ثانية» يرسل لنفس البريد", async () => {
    const bodies = mockForgot();
    renderAuth("/forgot-password");
    await userEvent.type(screen.getByLabelText("البريد الإلكتروني"), "abdu@example.com");
    await userEvent.click(screen.getByRole("button", { name: "أرسل الرابط" }));

    await userEvent.click(await screen.findByRole("button", { name: "أرسل الرابط مرة ثانية" }));

    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toEqual({ email: "abdu@example.com" });
  });

  test("بريد غلط: الزر معطّل", async () => {
    renderAuth("/forgot-password");

    await userEvent.type(screen.getByLabelText("البريد الإلكتروني"), "abdu@");

    expect(screen.getByRole("button", { name: "أرسل الرابط" })).toBeDisabled();
  });

  test.each([
    [422, "أدخل بريدًا إلكترونيًا صحيحًا."],
    [500, "تعذر إرسال الرابط. حاول مرة ثانية."],
  ])("خطأ %i", async (status, message) => {
    mockForgot(() => HttpResponse.json({}, { status }));
    renderAuth("/forgot-password");

    await userEvent.type(screen.getByLabelText("البريد الإلكتروني"), "abdu@example.com");
    await userEvent.click(screen.getByRole("button", { name: "أرسل الرابط" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });
});

describe("إعادة تعيين كلمة المرور", () => {
  function mockReset(response = () => HttpResponse.json({ ok: true })) {
    const bodies = [];
    server.use(
      http.post(`${API}/auth/reset-password`, async ({ request }) => {
        bodies.push(await request.json());
        return response();
      }),
    );
    return bodies;
  }

  async function fillNewPassword(password = "newpass123", confirm = password) {
    await userEvent.type(screen.getByLabelText("كلمة المرور الجديدة"), password);
    await userEvent.type(screen.getByLabelText("تأكيد كلمة المرور"), confirm);
  }

  test.each([
    ["بدون توكن", "/reset-password", "الرابط غير صالح أو مستخدم من قبل"],
    ["توكن تالف", "/reset-password?token=abc", "الرابط غير صالح أو مستخدم من قبل"],
    ["غرض ثاني", `/reset-password?token=${resetToken({ purpose: "login", exp: inMinutes(10) })}`, "الرابط غير صالح أو مستخدم من قبل"],
    ["منتهي", `/reset-password?token=${resetToken({ purpose: "password_reset", exp: inMinutes(-1) })}`, "انتهت صلاحية الرابط"],
  ])("%s: رسالة الرابط بدل النموذج", (_, route, title) => {
    renderAuth(route);

    expect(screen.getByRole("alert")).toHaveTextContent(title);
    expect(screen.queryByLabelText("كلمة المرور الجديدة")).not.toBeInTheDocument();
  });

  test("«اطلب رابط جديد» يودي لنسيت كلمة المرور", async () => {
    const { location } = renderAuth("/reset-password");

    await userEvent.click(screen.getByRole("button", { name: "اطلب رابط جديد" }));

    expect(location.current.pathname).toBe("/forgot-password");
  });

  test("رابط صالح: يحفظ، ثم «ارجع لتسجيل الدخول» يعرض رسالة النجاح هناك", async () => {
    const token = resetToken({ purpose: "password_reset", exp: inMinutes(10) });
    const bodies = mockReset();
    renderAuth(`/reset-password?token=${token}`);

    await fillNewPassword();
    await userEvent.click(screen.getByRole("button", { name: "احفظ كلمة المرور" }));

    expect(await screen.findByText("تقدر الحين تدخل حسابك بكلمة المرور الجديدة.")).toBeInTheDocument();
    expect(bodies).toEqual([{ token, new_password: "newpass123" }]);

    await userEvent.click(screen.getByRole("button", { name: "ارجع لتسجيل الدخول" }));
    expect(await screen.findByText("تم تغيير كلمة المرور. ادخل بكلمة المرور الجديدة.")).toBeInTheDocument();
  });

  test("كلمتين مختلفتين: الزر معطّل", async () => {
    renderAuth(`/reset-password?token=${resetToken({ purpose: "password_reset", exp: inMinutes(10) })}`);

    await fillNewPassword("newpass123", "other1234");

    expect(screen.getByRole("button", { name: "احفظ كلمة المرور" })).toBeDisabled();
  });

  test("400 من الخادم: الرابط مستخدم من قبل", async () => {
    mockReset(() => HttpResponse.json({ detail: "Invalid reset token" }, { status: 400 }));
    renderAuth(`/reset-password?token=${resetToken({ purpose: "password_reset", exp: inMinutes(10) })}`);

    await fillNewPassword();
    await userEvent.click(screen.getByRole("button", { name: "احفظ كلمة المرور" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("الرابط غير صالح أو مستخدم من قبل");
  });

  test.each([
    [422, "تأكد إن كلمة المرور من 8 إلى 72 حرفًا."],
    [500, "تعذر حفظ كلمة المرور. حاول مرة ثانية."],
  ])("خطأ %i يبقى في النموذج", async (status, message) => {
    mockReset(() => HttpResponse.json({}, { status }));
    renderAuth(`/reset-password?token=${resetToken({ purpose: "password_reset", exp: inMinutes(10) })}`);

    await fillNewPassword();
    await userEvent.click(screen.getByRole("button", { name: "احفظ كلمة المرور" }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText("كلمة المرور الجديدة")).toBeInTheDocument();
  });
});
