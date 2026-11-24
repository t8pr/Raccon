import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import Button from "./Button";

test("الافتراضي: زر عادي بالشكل الأساسي", () => {
  render(<Button>احفظ</Button>);

  const button = screen.getByRole("button", { name: "احفظ" });
  expect(button).toHaveAttribute("type", "button");
  expect(button).toHaveClass("ui-button", "ui-button--primary");
  expect(button).toBeEnabled();
});

test("الشكل وعرض كامل وكلاس إضافي", () => {
  render(
    <Button variant="outline" fullWidth className="extra" type="submit">
      إرسال
    </Button>,
  );

  const button = screen.getByRole("button", { name: "إرسال" });
  expect(button).toHaveClass("ui-button--outline", "ui-button--full", "extra");
  expect(button).toHaveAttribute("type", "submit");
});

test("الضغط يستدعي onClick", async () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>احفظ</Button>);

  await userEvent.click(screen.getByRole("button"));

  expect(onClick).toHaveBeenCalledTimes(1);
});

test("loading: معطّل، aria-busy، ودائرة تحميل", async () => {
  const onClick = vi.fn();
  const { container } = render(
    <Button loading onClick={onClick}>
      احفظ
    </Button>,
  );

  const button = screen.getByRole("button");
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute("aria-busy", "true");
  expect(container.querySelector(".ui-button__spinner")).toBeInTheDocument();

  await userEvent.click(button);
  expect(onClick).not.toHaveBeenCalled();
});

test("disabled ما يستدعي onClick", async () => {
  const onClick = vi.fn();
  render(
    <Button disabled onClick={onClick}>
      احفظ
    </Button>,
  );

  await userEvent.click(screen.getByRole("button"));

  expect(onClick).not.toHaveBeenCalled();
});

test("يمرر الخصائص الإضافية و ref للزر (ConfirmDialog يعتمد عليه للتركيز)", () => {
  const ref = createRef();
  render(
    <Button ref={ref} aria-label="إغلاق">
      ×
    </Button>,
  );

  const button = screen.getByRole("button", { name: "إغلاق" });
  expect(ref.current).toBe(button);
});
