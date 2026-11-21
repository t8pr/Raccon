import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { prepareHintImage } from "../utils/prepareHintImage";
import ImageUploader from "./ImageUploader";

vi.mock("../utils/prepareHintImage", () => ({ prepareHintImage: vi.fn() }));

beforeEach(() => {
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:preview", revokeObjectURL: () => {} }));
  vi.mocked(prepareHintImage).mockImplementation(async (file) => file);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// الأب يحتفظ بالقيمة، مثل صفحة التخصيص
function Uploader({ initial = "", onBusyChange = () => {}, disabled = false }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <ImageUploader value={value} onChange={setValue} onBusyChange={onBusyChange} disabled={disabled} />
      <output data-testid="value">{value instanceof Blob ? `file:${value.name}` : value}</output>
    </>
  );
}

const fileInput = (container) => container.querySelector('input[type="file"]');
const png = () => new File(["x"], "hint.png", { type: "image/png" });

test("بدون صورة: زر الاختيار والحد الأقصى", () => {
  render(<Uploader />);

  expect(screen.getByRole("button", { name: "اختيار صورة التلميح" })).toHaveAccessibleDescription(
    "الحد الأقصى لحجم الصورة: 2 MB",
  );
});

test("اختيار صورة: تجهيز، معاينة، والقيمة ملف (الرفع عند الحفظ فقط)", async () => {
  const onBusyChange = vi.fn();
  const { container } = render(<Uploader onBusyChange={onBusyChange} />);

  await userEvent.upload(fileInput(container), png());

  expect(await screen.findByRole("img", { name: "تلميح" })).toHaveAttribute("src", "blob:preview");
  expect(screen.getByTestId("value")).toHaveTextContent("file:hint.png");
  expect(onBusyChange.mock.calls).toEqual([[true], [false]]);
});

test("أثناء التجهيز: رسالة الانتظار", async () => {
  let finish;
  vi.mocked(prepareHintImage).mockImplementation(() => new Promise((resolve) => (finish = resolve)));
  const { container } = render(<Uploader />);

  await userEvent.upload(fileInput(container), png());

  expect(screen.getByText("جاري فحص وتجهيز الصورة...")).toBeInTheDocument();
  finish(png());
  expect(await screen.findByRole("img", { name: "تلميح" })).toBeInTheDocument();
});

test("فشل التجهيز: رسالة الخطأ والقيمة ما تتغيّر", async () => {
  vi.mocked(prepareHintImage).mockRejectedValue(new Error("اختر صورة بصيغة JPG أو PNG أو WebP."));
  const { container } = render(<Uploader />);

  await userEvent.upload(fileInput(container), png());

  expect(await screen.findByRole("alert")).toHaveTextContent("اختر صورة بصيغة JPG أو PNG أو WebP.");
  expect(screen.getByTestId("value")).toBeEmptyDOMElement();
});

test("صورة محفوظة: «إزالة الصورة» تفضيها، و«استبدال» يفتح اختيار ملف", async () => {
  const { container } = render(<Uploader initial="https://cdn.test/old.png" />);

  expect(screen.getByRole("img", { name: "تلميح" })).toHaveAttribute("src", "https://cdn.test/old.png");
  const click = vi.spyOn(fileInput(container), "click");
  await userEvent.click(screen.getByRole("button", { name: "استبدال الصورة" }));
  expect(click).toHaveBeenCalled();

  await userEvent.click(screen.getByRole("button", { name: "إزالة الصورة" }));
  await waitFor(() => expect(screen.getByTestId("value")).toBeEmptyDOMElement());
  expect(screen.getByRole("button", { name: "اختيار صورة التلميح" })).toBeInTheDocument();
});

test("معطّل: ما يقبل اختيار ولا إزالة", () => {
  render(<Uploader initial="https://cdn.test/old.png" disabled />);

  expect(screen.getByRole("button", { name: "إزالة الصورة" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "استبدال الصورة" })).toBeDisabled();
});
