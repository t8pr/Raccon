import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import InlineMessage from "./InlineMessage";

// الخطأ والتحذير يقرأهم قارئ الشاشة فورًا (alert)، والباقي بهدوء (status)
test.each([
  ["error", "alert"],
  ["warning", "alert"],
  ["info", "status"],
  ["success", "status"],
])("%s → role=%s", (type, role) => {
  render(<InlineMessage type={type} message="رسالة" />);

  const box = screen.getByRole(role);
  expect(box).toHaveTextContent("رسالة");
  expect(box).toHaveClass(`inline-message--${type}`);
});

test("الافتراضي info والأيقونة يمين", () => {
  render(<InlineMessage message="معلومة" />);

  const box = screen.getByRole("status");
  expect(box).toHaveClass("inline-message--info");
  expect(box).not.toHaveClass("inline-message--icon-left");
});

test("الأيقونة يسار", () => {
  render(<InlineMessage message="x" iconSide="left" />);

  expect(screen.getByRole("status")).toHaveClass("inline-message--icon-left");
});
