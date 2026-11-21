import { describe, expect, test } from "vitest";
import {
  buildAllTagsConfig,
  buildTagConfig,
  buildTagContent,
  getSavedTagForm,
  getTrapType,
} from "./tagForm";

const trap = (content) => ({ tag_id: "t", tag_type: "trap", content });

describe("getTrapType", () => {
  test.each([
    ["تجميد", trap({ freeze: 90 }), "freeze"],
    ["تجميد بصفر", trap({ freeze: 0 }), "freeze"],
    ["قنبلة", trap({ boom: 1 }), "boom"],
    ["اختيار فخ", trap({ choose: true }), "choose"],
    ["فخ بمحتوى غير معروف", trap({ x: 1 }), "none"],
    ["فخ بلا محتوى", trap(null), "none"],
    ["تلميح", { tag_type: "clue", content: { freeze: 90 } }, "none"],
    ["بدون قطعة", null, "none"],
  ])("%s", (_, tag, type) => {
    expect(getTrapType(tag)).toBe(type);
  });
});

describe("getSavedTagForm", () => {
  test("تلميح بصورة", () => {
    expect(
      getSavedTagForm({ tag_type: "clue", content: { hint: "تحت الكرسي", image: "https://x/a.png" } }),
    ).toEqual({ hint: "تحت الكرسي", image: "https://x/a.png", trap: "none", freezeSeconds: 60 });
  });

  test("فخ تجميد يحتفظ بمدته", () => {
    expect(getSavedTagForm(trap({ freeze: 90 })).freezeSeconds).toBe(90);
  });

  test("قطعة فاضية تاخذ القيم الافتراضية", () => {
    expect(getSavedTagForm({ tag_type: "clue", content: null })).toEqual({
      hint: "",
      image: "",
      trap: "none",
      freezeSeconds: 60,
    });
  });
});

describe("buildTagContent", () => {
  test("الفخاخ", () => {
    expect(buildTagContent({ trap: "boom" })).toEqual({ boom: 1 });
    expect(buildTagContent({ trap: "freeze", freezeSeconds: "45" })).toEqual({ freeze: 45 });
    expect(buildTagContent({ trap: "choose" })).toEqual({ choose: true });
  });

  test("تلميح مع صورة وبدونها", () => {
    expect(buildTagContent({ trap: "none", hint: "عند الباب", imageUrl: "https://x/a.png" })).toEqual({
      hint: "عند الباب",
      image: "https://x/a.png",
    });
    expect(buildTagContent({ trap: "none", hint: "عند الباب", imageUrl: "" })).toEqual({
      hint: "عند الباب",
    });
  });

  test("الفخ يتجاهل التلميح والصورة", () => {
    expect(buildTagContent({ trap: "boom", hint: "x", imageUrl: "https://x/a.png" })).toEqual({ boom: 1 });
  });
});

test("buildTagConfig يحدد النوع من الفخ", () => {
  const tag = { tag_id: "t9" };

  expect(buildTagConfig(tag, { trap: "none", hint: "h" })).toEqual({
    tag_id: "t9",
    tag_type: "clue",
    content: { hint: "h" },
  });
  expect(buildTagConfig(tag, { trap: "freeze", freezeSeconds: 30 })).toEqual({
    tag_id: "t9",
    tag_type: "trap",
    content: { freeze: 30 },
  });
});

describe("buildAllTagsConfig", () => {
  const tags = [
    { tag_id: "t1", tag_type: "clue", content: { hint: "قديم" } },
    { tag_id: "t2", tag_type: "trap", content: { boom: 1 } },
    { tag_id: "t3", tag_type: null, content: null },
  ];
  const selected = { tag_id: "t1", tag_type: "clue", content: { hint: "جديد" } };

  test("القطعة المختارة بالإعداد الجديد، والباقي كما هو، والفاضية تلميح فارغ", () => {
    expect(buildAllTagsConfig(tags, selected)).toEqual([
      selected,
      { tag_id: "t2", tag_type: "trap", content: { boom: 1 } },
      { tag_id: "t3", tag_type: "clue", content: { hint: "" } },
    ]);
  });

  test("ينسخ المحتوى بدل ما يشارك نفس الكائن", () => {
    const result = buildAllTagsConfig(tags, selected);

    expect(result[1].content).not.toBe(tags[1].content);
  });
});
