/*
  شاشات المسح اللي تطلع في المعاينة، حسب النمط.
  المشتركة تطلع في النمطين، والباقي خاص بنمط واحد:
    مو بالترتيب          تسلسلي بس
    الفخاخ (5 شاشات)     صيد مفتوح بس
  id = اسم الشاشة في الرابط (?s=...)، والاسم المعروض من الترجمة: customization.preview.screens.<id>
*/
export const PREVIEW_SCREENS = {
  seq: [
    "found",
    "already",
    "skipped",
    "claimed",
    "notlive",
    "completed",
    "notyours",
  ],
  open: [
    "found",
    "already",
    "claimed",
    "notlive",
    "completed",
    "notyours",
    "choose",
    "planted",
    "boom",
    "frozen",
    "unfrozen",
  ],
};

export const PREVIEW_MODES = ["seq", "open"];

// أول شاشة تطلع للقطعة: الفخ يفتح على شاشة فخّه، وغيره على «حصّلتها»
const TRAP_SCREEN = { choose: "choose", boom: "boom", freeze: "frozen" };

export function defaultScreenFor(trapType) {
  return TRAP_SCREEN[trapType] ?? "found";
}
