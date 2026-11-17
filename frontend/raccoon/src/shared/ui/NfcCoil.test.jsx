import { render } from "@testing-library/react";
import { expect, test } from "vitest";

import NfcCoil from "./NfcCoil";

test("زخرفة فقط: مخفية عن قارئ الشاشة", () => {
  const { container } = render(<NfcCoil className="extra" />);

  const svg = container.querySelector("svg");
  expect(svg).toHaveAttribute("aria-hidden", "true");
  expect(svg).toHaveClass("nfc-coil", "extra");
});

test("bare: اللولب بدون الشريحة، فعدد العناصر أقل", () => {
  const full = render(<NfcCoil />).container.querySelectorAll("svg *").length;
  const bare = render(<NfcCoil bare />).container.querySelectorAll("svg *").length;

  expect(bare).toBeLessThan(full);
});
