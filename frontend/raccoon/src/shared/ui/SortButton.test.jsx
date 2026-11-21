import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import SortButton from "./SortButton";

const options = [
  { value: "default", label: "الترتيب الافتراضي" },
  { value: "price-asc", label: "السعر: الأقل أولًا" },
];

test("الخيارات تبدأ بكلمة «ترتيب:» والقيمة الحالية مختارة", () => {
  render(<SortButton options={options} value="price-asc" onChange={() => {}} />);

  const select = screen.getByRole("combobox", { name: "ترتيب الباكجات" });
  expect(select).toHaveValue("price-asc");
  expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
    "ترتيب: الترتيب الافتراضي",
    "ترتيب: السعر: الأقل أولًا",
  ]);
});

test("التغيير يرجع القيمة الجديدة", async () => {
  const onChange = vi.fn();
  render(<SortButton options={options} value="default" onChange={onChange} />);

  await userEvent.selectOptions(screen.getByRole("combobox"), "price-asc");

  expect(onChange).toHaveBeenCalledWith("price-asc");
});
