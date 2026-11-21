import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import DurationStepper from "./DurationStepper";

// الأب يحتفظ بالقيمة، مثل TrapField و TrapPicker
function Stepper({ initial, ...props }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <DurationStepper value={value} onChange={setValue} {...props} />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  );
}

const input = () => screen.getByRole("spinbutton", { name: "مدة التجميد بالثواني" });
const minus = () => screen.getByRole("button", { name: "تقليل مدة التجميد ثانية واحدة" });
const plus = () => screen.getByRole("button", { name: "زيادة مدة التجميد ثانية واحدة" });
const parentValue = () => JSON.parse(screen.getByTestId("value").textContent);

test("الزرين يزيدون وينقصون ثانية", async () => {
  render(<Stepper initial={60} />);

  await userEvent.click(plus());
  await userEvent.click(plus());
  expect(input()).toHaveValue(62);

  await userEvent.click(minus());
  expect(parentValue()).toBe(61);
});

describe("الحدود 1 و 180", () => {
  test("عند 1 زر التقليل معطّل", () => {
    render(<Stepper initial={1} />);

    expect(minus()).toBeDisabled();
    expect(plus()).toBeEnabled();
  });

  test("عند 180 زر الزيادة معطّل", () => {
    render(<Stepper initial={180} />);

    expect(plus()).toBeDisabled();
    expect(minus()).toBeEnabled();
  });
});

test("الكتابة ترجع النص للأب كما هو", async () => {
  render(<Stepper initial={60} />);

  await userEvent.clear(input());
  await userEvent.type(input(), "45");

  expect(parentValue()).toBe("45");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

describe("قيمة غلط", () => {
  test.each(["", "0", "200", "1.5"])("%j: رسالة خطأ مربوطة بالحقل", (value) => {
    render(<Stepper initial={value} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("أدخل عددًا صحيحًا من 1 إلى 180 ثانية.");
    expect(input()).toHaveAttribute("aria-invalid", "true");
    expect(input().getAttribute("aria-describedby")).toContain(alert.id);
  });

  test("الزر يبدأ من 1 لو القيمة غلط", async () => {
    render(<Stepper initial="" />);

    await userEvent.click(plus());

    expect(parentValue()).toBe(2);
  });
});

test("describedBy الخارجي ينضاف مع رسالة الخطأ", () => {
  render(<Stepper initial="" describedBy="hint-id" />);

  expect(input().getAttribute("aria-describedby")).toMatch(/^hint-id /);
});

test("معطّل: الحقل والزرين", () => {
  render(<Stepper initial={60} disabled />);

  expect(input()).toBeDisabled();
  expect(minus()).toBeDisabled();
  expect(plus()).toBeDisabled();
});
