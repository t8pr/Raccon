import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import FilterBar from "./FilterBar";

const filters = [
  { value: "all", label: "الكل" },
  { value: "sequential", label: "تسلسلي" },
  { value: "open", label: "صيد مفتوح" },
];

test("كل فلتر زر، والمختار عليه aria-pressed", () => {
  render(<FilterBar filters={filters} value="open" onChange={() => {}} />);

  expect(screen.getAllByRole("button")).toHaveLength(3);
  expect(screen.getByRole("button", { name: "صيد مفتوح" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "الكل" })).toHaveAttribute("aria-pressed", "false");
});

test("الضغط يرجع قيمة الفلتر", async () => {
  const onChange = vi.fn();
  render(<FilterBar filters={filters} value="all" onChange={onChange} />);

  await userEvent.click(screen.getByRole("button", { name: "تسلسلي" }));

  expect(onChange).toHaveBeenCalledWith("sequential");
});

test("اسم المجموعة لقارئ الشاشة", () => {
  const { rerender } = render(<FilterBar filters={filters} value="all" onChange={() => {}} />);
  expect(screen.getByRole("group", { name: "نوع الباكج" })).toBeInTheDocument();

  rerender(<FilterBar filters={filters} value="all" onChange={() => {}} label="طريقة اللعب" />);
  expect(screen.getByRole("group", { name: "طريقة اللعب" })).toBeInTheDocument();
});

test("مكان الترتيب يعرض العنصر الممرر", () => {
  render(<FilterBar filters={filters} value="all" onChange={() => {}} sort={<span>ترتيب</span>} />);

  expect(screen.getByText("ترتيب")).toBeInTheDocument();
});
