// تحويل جولات المستخدم إلى بطاقات «باقاتي»، والفلترة حسب طريقة اللعب. دوال خالصة.

import { MODE_OPTIONS, normalizeMode } from "../../shared/constants/modes";
import i18n from "../../i18n";

// قيمة داخلية للجولة بدون اسم؛ البطاقة تعرضها مترجمة (packages.untitled)
export const UNTITLED = "بدون اسم";

// الأسماء الافتراضية من الخادم تُعرض «بدون اسم».
export function getDisplayName(title) {
  const trimmed = title?.trim() ?? "";
  const isUntitled =
    !trimmed || /^(untitled(?:\s+event)?|بدون اسم)$/i.test(trimmed);

  return isUntitled ? UNTITLED : trimmed;
}

// لون البطاقة من طريقة اللعب: "seq" | "open" | "unknown" (طريقة فاضية أو غير معروفة)
export function getPackageTone(mode) {
  const normalized = normalizeMode(mode);

  if (normalized === "open") return "open";
  if (normalized === "sequential") return "seq";
  return "unknown";
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

export const PACKAGE_FILTERS = [
  {
    value: "all",
    get label() {
      return i18n.t("common.all");
    },
  },
  ...MODE_OPTIONS,
];

// الخادم يرسل "seq"، والفلتر يستخدم "sequential"
export function filterPackages(items, filter) {
  return items.filter(
    (pkg) => filter === "all" || normalizeMode(pkg.mode) === filter,
  );
}
