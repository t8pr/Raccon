import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import Pagination from "./Pagination";

// «…» مخفي عن قارئ الشاشة (aria-hidden)، فنقرأ كل عناصر القائمة مباشرة
const pageLabels = () =>
  [...screen.getByRole("navigation", { name: "الصفحات" }).querySelectorAll("li")].map((item) => item.textContent);

test("صفحة وحدة: الملخص بس بدون أزرار", () => {
  render(<Pagination page={1} totalPages={1} onChange={() => {}} summary="عرض 1–3 من 3" />);

  expect(screen.getByText("عرض 1–3 من 3")).toBeInTheDocument();
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
});

test("صفحة وحدة بدون ملخص: ما يرسم شي", () => {
  const { container } = render(<Pagination page={1} totalPages={1} onChange={() => {}} />);

  expect(container).toBeEmptyDOMElement();
});

test("7 صفحات أو أقل: كل الأرقام", () => {
  render(<Pagination page={1} totalPages={7} onChange={() => {}} />);

  expect(pageLabels()).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
});

test.each([
  [1, ["1", "2", "…", "10"]],
  [5, ["1", "…", "4", "5", "6", "…", "10"]],
  [10, ["1", "…", "9", "10"]],
])("10 صفحات والحالية %i: «…» بين الفجوات", (page, labels) => {
  render(<Pagination page={page} totalPages={10} onChange={() => {}} />);

  expect(pageLabels()).toEqual(labels);
});

test("السابق والتالي والرقم يرجعون رقم الصفحة", async () => {
  const onChange = vi.fn();
  render(<Pagination page={5} totalPages={10} onChange={onChange} />);

  await userEvent.click(screen.getByRole("button", { name: /السابق/ }));
  await userEvent.click(screen.getByRole("button", { name: /التالي/ }));
  await userEvent.click(screen.getByRole("button", { name: "صفحة 10" }));

  expect(onChange.mock.calls).toEqual([[4], [6], [10]]);
  expect(screen.getByText("صفحة 5 من 10")).toBeInTheDocument();
});
