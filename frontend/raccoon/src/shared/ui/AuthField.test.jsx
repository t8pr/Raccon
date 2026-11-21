import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import AuthField from "./AuthField";

// حقل متحكَّم فيه مثل النماذج الحقيقية
function Field(props) {
  const [value, setValue] = useState("");
  return <AuthField label="الاسم" name="name" value={value} onChange={(e) => setValue(e.target.value)} {...props} />;
}

test("العنوان مربوط بالحقل والكتابة تشتغل", async () => {
  render(<Field />);

  const input = screen.getByLabelText("الاسم");
  await userEvent.type(input, "نورة");

  expect(input).toHaveValue("نورة");
  expect(input).toHaveAttribute("dir", "rtl");
  expect(input).toHaveAttribute("aria-invalid", "false");
});

describe("الرسائل", () => {
  test("الخطأ: aria-invalid ورسالة alert مربوطة بالحقل", () => {
    render(<Field error="أدخل اسمك" helper="مساعدة" />);

    const input = screen.getByLabelText("الاسم");
    const alert = screen.getByRole("alert");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(alert).toHaveTextContent("أدخل اسمك");
    expect(input).toHaveAttribute("aria-describedby", alert.id);
    expect(input.closest(".auth-field")).toHaveClass("auth-field--error");
  });

  test("المساعدة تظهر بدون alert", () => {
    render(<Field helper="حروف إنجليزية صغيرة" />);

    expect(screen.getByText("حروف إنجليزية صغيرة")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("بدون رسالة: ما فيه aria-describedby", () => {
    render(<Field />);

    expect(screen.getByLabelText("الاسم")).not.toHaveAttribute("aria-describedby");
  });

  test("النجاح ما يظهر مع الخطأ", () => {
    const { container, rerender } = render(<Field success />);
    expect(container.firstChild).toHaveClass("auth-field--success");

    rerender(<Field success error="x" />);
    expect(container.firstChild).not.toHaveClass("auth-field--success");
  });
});

test("كلمة المرور: زر الإظهار والإخفاء", async () => {
  render(<Field label="كلمة المرور" type="password" />);

  const input = screen.getByLabelText("كلمة المرور");
  expect(input).toHaveAttribute("type", "password");
  expect(input).toHaveAttribute("dir", "ltr");

  await userEvent.click(screen.getByRole("button", { name: "إظهار كلمة المرور" }));
  expect(input).toHaveAttribute("type", "text");

  await userEvent.click(screen.getByRole("button", { name: "إخفاء كلمة المرور" }));
  expect(input).toHaveAttribute("type", "password");
});

test("الجوال: مفتاح +966 ولوحة أرقام", () => {
  render(<Field label="رقم الجوال" type="tel" />);

  const input = screen.getByLabelText("رقم الجوال");
  expect(screen.getByText("+966")).toBeInTheDocument();
  expect(input).toHaveAttribute("inputmode", "numeric");
  expect(input).toHaveAttribute("dir", "ltr");
});

test("معطّل: الحقل وزر الإظهار", () => {
  render(<Field label="كلمة المرور" type="password" disabled />);

  expect(screen.getByLabelText("كلمة المرور")).toBeDisabled();
  expect(screen.getByRole("button")).toBeDisabled();
});

test("inputDir يغلب الاتجاه الافتراضي", () => {
  render(<Field type="email" label="البريد" inputDir="rtl" />);

  expect(screen.getByLabelText("البريد")).toHaveAttribute("dir", "rtl");
});
