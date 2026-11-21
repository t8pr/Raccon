// قواعد الفخاخ المشتركة بين صفحة التخصيص (المالك) وشاشة اختيار الفخ (اللاعب).
// نفس حدود الخادم: مدة التجميد عدد صحيح من 1 إلى 180 ثانية.

export const FREEZE_MIN_SECONDS = 1;
export const FREEZE_MAX_SECONDS = 180;
export const FREEZE_DEFAULT_SECONDS = 60;

export function isValidFreezeSeconds(value) {
  const seconds = Number(value);

  return (
    String(value ?? "").trim() !== "" &&
    Number.isInteger(seconds) &&
    seconds >= FREEZE_MIN_SECONDS &&
    seconds <= FREEZE_MAX_SECONDS
  );
}

// يُبقي القيمة داخل الحدود المسموحة
export function clampFreezeSeconds(value) {
  return Math.min(FREEZE_MAX_SECONDS, Math.max(FREEZE_MIN_SECONDS, value));
}
