import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import SortButton from "./SortButton";

// Figma: components-final · 04 · Sort / Dropdown
const options = [
  { value: "default", label: "الحجم والسعر" },
  { value: "price-asc", label: "السعر: الأقل أولًا" },
  { value: "price-desc", label: "السعر: الأعلى أولًا" },
];

function renderSort(props = {}) {
  const onChange = vi.fn();
  render(<SortButton options={options} value="default" onChange={onChange} {...props} />);
  return { onChange, trigger: screen.getByRole("combobox", { name: "ترتيب الباكجات" }) };
}

test("الزر يعرض «ترتيب:» + الخيار الحالي، والقائمة مقفلة", () => {
  const { trigger } = renderSort({ value: "price-asc" });

  expect(trigger).toHaveTextContent("ترتيب: السعر: الأقل أولًا");
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
});

test("الضغط يفتح القائمة: الخيارات بدون «ترتيب:» والحالي محدد", async () => {
  const { trigger } = renderSort();

  await userEvent.click(trigger);

  expect(trigger).toHaveAttribute("aria-expanded", "true");
  const items = await screen.findAllByRole("option");
  expect(items.map((item) => item.textContent)).toEqual(options.map((o) => o.label));
  expect(screen.getByRole("option", { name: "الحجم والسعر" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("اختيار خيار يرجّع قيمته ويقفل القائمة", async () => {
  const { onChange, trigger } = renderSort();

  await userEvent.click(trigger);
  await userEvent.click(await screen.findByRole("option", { name: "السعر: الأعلى أولًا" }));

  expect(onChange).toHaveBeenCalledWith("price-desc");
  expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("Esc يقفل القائمة بدون تغيير ويرجع التركيز للزر", async () => {
  const { onChange, trigger } = renderSort();

  await userEvent.click(trigger);
  await screen.findByRole("listbox");
  await userEvent.keyboard("{Escape}");

  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
  expect(trigger).toHaveFocus();
});
