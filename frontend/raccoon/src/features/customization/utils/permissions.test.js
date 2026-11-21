import { describe, expect, test } from "vitest";
import { getPermissions } from "./permissions";

const configured = { tag_id: "t1", is_configured: true };
const empty = { tag_id: "t2", is_configured: false };

// الحالة الافتراضية: مسودة، قطعة مختارة غير محفوظة، لا شيء يحمّل
function permissions({ event, ...overrides } = {}) {
  return getPermissions({
    event: { status: "draft", edits_remaining: 3, tags: [configured, empty], ...event },
    selectedTag: empty,
    isEditing: false,
    hasChanges: false,
    freezeIsValid: true,
    isPreparingImage: false,
    isSaving: false,
    isStarting: false,
    isFetching: false,
    ...overrides,
  });
}

describe("حسب حالة الجولة", () => {
  test("مسودة: التخصيص مفتوح بدون طلب تعديل", () => {
    const p = permissions();

    expect(p.isLive).toBe(false);
    expect(p.canCustomize).toBe(true);
    expect(p.canStartEditing).toBe(false);
    expect(p.canRequestEdit).toBe(false);
  });

  test("متوقفة: التخصيص مقفل حتى يبدأ وضع التعديل", () => {
    const paused = { event: { status: "paused" } };

    expect(permissions(paused).canCustomize).toBe(false);
    expect(permissions(paused).canRequestEdit).toBe(true);

    const editing = permissions({ ...paused, isEditing: true });
    expect(editing.canCustomize).toBe(true);
    expect(editing.canRequestEdit).toBe(false);
  });

  test("متوقفة بدون تعديلات متبقية: ما فيه تعديل", () => {
    const p = permissions({ event: { status: "paused", edits_remaining: 0 }, isEditing: true });

    expect(p.canStartEditing).toBe(false);
    expect(p.canRequestEdit).toBe(false);
    expect(p.canCustomize).toBe(false);
  });

  test("شغّالة: لا تخصيص، والإيقاف متاح إلا أثناء الحفظ أو البدء", () => {
    const live = { event: { status: "live" } };

    expect(permissions(live).isLive).toBe(true);
    expect(permissions(live).canCustomize).toBe(false);
    expect(permissions(live).canChangeRoundStatus).toBe(true);
    expect(permissions({ ...live, isSaving: true }).canChangeRoundStatus).toBe(false);
    expect(permissions({ ...live, isStarting: true }).canChangeRoundStatus).toBe(false);
  });
});

describe("عدّ القطع", () => {
  test("configuredCount و allTagsReady", () => {
    expect(permissions().configuredCount).toBe(1);
    expect(permissions().allTagsReady).toBe(false);
    expect(permissions({ event: { tags: [configured] } }).allTagsReady).toBe(true);
  });

  test("جولة بلا قطع ليست جاهزة", () => {
    expect(permissions({ event: { tags: [] } }).allTagsReady).toBe(false);
  });
});

describe("canSaveTag", () => {
  test("قطعة ما انحفظت قبل تنحفظ حتى بدون تعديل", () => {
    expect(permissions().canSaveTag).toBe(true);
  });

  test("قطعة محفوظة تحتاج تعديل", () => {
    expect(permissions({ selectedTag: configured }).canSaveTag).toBe(false);
    expect(permissions({ selectedTag: configured, hasChanges: true }).canSaveTag).toBe(true);
  });

  test.each([
    ["بدون قطعة مختارة", { selectedTag: null }],
    ["مدة تجميد غلط", { freezeIsValid: false }],
    ["الصورة تتجهز", { isPreparingImage: true }],
    ["التخصيص مقفل", { event: { status: "live" } }],
  ])("ممنوع: %s", (_, overrides) => {
    expect(permissions(overrides).canSaveTag).toBe(false);
  });
});

describe("canSaveAllTags", () => {
  test("مسموح في الحالة العادية", () => {
    expect(permissions().canSaveAllTags).toBe(true);
  });

  test.each([
    ["بلا قطع", { event: { tags: [] } }],
    ["مدة تجميد غلط", { freezeIsValid: false }],
    ["الصورة تتجهز", { isPreparingImage: true }],
    ["أثناء الحفظ", { isSaving: true }],
    ["أثناء البدء", { isStarting: true }],
    ["أثناء التحميل", { isFetching: true }],
  ])("ممنوع: %s", (_, overrides) => {
    expect(permissions(overrides).canSaveAllTags).toBe(false);
  });
});

describe("بدء الجولة (canChangeRoundStatus لغير الشغّالة)", () => {
  const ready = { event: { tags: [configured] } };

  test("مسموح لما كل القطع محفوظة", () => {
    expect(permissions(ready).canChangeRoundStatus).toBe(true);
    expect(permissions({ event: { status: "paused", tags: [configured] } }).canChangeRoundStatus).toBe(true);
  });

  test("ممنوع إذا فيه قطعة ما انحفظت", () => {
    expect(permissions().canChangeRoundStatus).toBe(false);
  });

  test.each([
    ["تعديلات معلّقة", { hasChanges: true }],
    ["وضع التعديل", { isEditing: true }],
    ["أثناء الحفظ", { isSaving: true }],
    ["أثناء البدء", { isStarting: true }],
    ["الصورة تتجهز", { isPreparingImage: true }],
    ["أثناء التحميل", { isFetching: true }],
  ])("ممنوع: %s", (_, overrides) => {
    expect(permissions({ ...ready, ...overrides }).canChangeRoundStatus).toBe(false);
  });
});

test("busy أثناء الحفظ أو البدء أو تجهيز الصورة", () => {
  expect(permissions().busy).toBe(false);
  expect(permissions({ isSaving: true }).busy).toBe(true);
  expect(permissions({ isStarting: true }).busy).toBe(true);
  expect(permissions({ isPreparingImage: true }).busy).toBe(true);
});
