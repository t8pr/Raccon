// تحويل جولات المستخدم إلى بطاقات «باقاتي»، والفلترة حسب طريقة اللعب. دوال خالصة.

import { MODE_OPTIONS, normalizeMode } from "../../shared/constants/modes";

export const UNTITLED = "بدون اسم";

// الأسماء الافتراضية من الخادم تُعرض «بدون اسم».
export function getDisplayName(title) {
  const trimmed = title?.trim() ?? "";
  const isUntitled =
    !trimmed || /^(untitled(?:\s+event)?|بدون اسم)$/i.test(trimmed);

  return isUntitled ? UNTITLED : trimmed;
}

// جولة من الخادم → بطاقة
export function toPackageItem(event) {
  return {
    id: event.id,
    eventId: event.id,
    name: getDisplayName(event.title),
    mode: event.mode,
    pieces: event.tags_count,
  };
}

export const PACKAGE_FILTERS = [{ value: "all", label: "الكل" }, ...MODE_OPTIONS];

// الخادم يرسل "seq"، والفلتر يستخدم "sequential"
export function filterPackages(items, filter) {
  return items.filter(
    (pkg) => filter === "all" || normalizeMode(pkg.mode) === filter,
  );
}
