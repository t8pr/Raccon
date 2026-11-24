import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import Chip from "./Chip";

test("الافتراضي", () => {
  render(<Chip>تسلسلي</Chip>);

  expect(screen.getByText("تسلسلي")).toHaveClass("chip", "chip--accent", "chip--sm");
});

test("اللون والحجم", () => {
  render(
    <Chip tone="mint" size="md">
      متاحة
    </Chip>,
  );

  expect(screen.getByText("متاحة")).toHaveClass("chip--mint", "chip--md");
});
