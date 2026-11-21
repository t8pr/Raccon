import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { makeTag } from "../../../test/fixtures";
import { useTagForm } from "./useTagForm";

const tags = [
  makeTag(1, { is_configured: true, content: { hint: "تحت الكرسي", image: "https://x/a.png" } }),
  makeTag(2, { is_configured: true, tag_type: "trap", content: { freeze: 90 } }),
  makeTag(3),
];

const renderForm = (supportsTraps = true, list = tags) =>
  renderHook(({ items }) => useTagForm(items, supportsTraps), { initialProps: { items: list } });

describe("القطعة المختارة", () => {
  test("أول قطعة افتراضيًا، والنموذج يعرض المحفوظ", () => {
    const { result } = renderForm();

    expect(result.current.selectedTag.tag_id).toBe("t1");
    expect(result.current.form).toEqual({
      hint: "تحت الكرسي",
      image: "https://x/a.png",
      trap: "none",
      freezeSeconds: 60,
    });
    expect(result.current.hasChanges).toBe(false);
  });

  test("اختيار قطعة ثانية يمسح التعديلات غير المحفوظة", () => {
    const { result } = renderForm();
    act(() => result.current.setHint("تعديل"));

    act(() => result.current.selectTag("t2"));

    expect(result.current.selectedTag.tag_id).toBe("t2");
    expect(result.current.form.trap).toBe("freeze");
    expect(result.current.form.freezeSeconds).toBe(90);
    expect(result.current.hasChanges).toBe(false);
  });

  test("لو انحذفت القطعة المختارة يرجع لأول قطعة", () => {
    const { result, rerender } = renderForm();
    act(() => result.current.selectTag("t3"));

    rerender({ items: tags.slice(0, 2) });

    expect(result.current.selectedTag.tag_id).toBe("t1");
  });

  test("أثناء التحميل (بلا قطع) ما ينكسر", () => {
    const { result } = renderForm(true, []);

    expect(result.current.selectedTag).toBeUndefined();
    expect(result.current.form.hint).toBe("");
  });
});

describe("hasChanges", () => {
  test("تعديل التلميح أو الصورة", () => {
    const { result } = renderForm();

    act(() => result.current.setHint("جديد"));
    expect(result.current.hasChanges).toBe(true);

    act(() => result.current.setHint("تحت الكرسي"));
    expect(result.current.hasChanges).toBe(false);

    act(() => result.current.setImage(""));
    expect(result.current.hasChanges).toBe(true);
  });

  test("تغيير نوع الفخ", () => {
    const { result } = renderForm();

    act(() => result.current.setTrap("boom"));

    expect(result.current.hasChanges).toBe(true);
    expect(result.current.isTrapSelected).toBe(true);
  });

  test("تغيير مدة التجميد فقط", () => {
    const { result } = renderForm();
    act(() => result.current.selectTag("t2"));

    act(() => result.current.setFreezeSeconds("90"));
    expect(result.current.hasChanges).toBe(false);

    act(() => result.current.setFreezeSeconds(120));
    expect(result.current.hasChanges).toBe(true);
  });

  test("القطعة الفخ ما تحسب تعديل التلميح", () => {
    const { result } = renderForm();
    act(() => result.current.selectTag("t2"));

    act(() => result.current.setHint("نص"));

    expect(result.current.hasChanges).toBe(false);
  });

  test("التسلسلي (بلا فخاخ) يحسب تعديل التلميح دائمًا", () => {
    const { result } = renderForm(false);
    act(() => result.current.selectTag("t2"));

    act(() => result.current.setHint("نص"));

    expect(result.current.isTrapSelected).toBe(false);
    expect(result.current.hasChanges).toBe(true);
  });

  test("reset يرجع للمحفوظ", () => {
    const { result } = renderForm();
    act(() => {
      result.current.setHint("x");
      result.current.setTrap("boom");
    });

    act(() => result.current.reset());

    expect(result.current.hasChanges).toBe(false);
    expect(result.current.form.hint).toBe("تحت الكرسي");
  });
});

describe("freezeIsValid", () => {
  test.each([
    [60, true],
    [180, true],
    [0, false],
    [181, false],
    ["", false],
  ])("تجميد %j → %s", (seconds, valid) => {
    const { result } = renderForm();
    act(() => {
      result.current.setTrap("freeze");
      result.current.setFreezeSeconds(seconds);
    });

    expect(result.current.freezeIsValid).toBe(valid);
  });

  test("غير التجميد دائمًا صالح", () => {
    const { result } = renderForm();
    act(() => result.current.setFreezeSeconds(0));

    expect(result.current.freezeIsValid).toBe(true);
  });
});
