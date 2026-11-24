// نوع التجربة (الوضع): المكان الوحيد لتسمياته وتحويلاته.
// الخادم يستخدم "seq" / "open"، والواجهة تستخدم "sequential" / "open".
import i18n from "../../i18n";

export const MODE = {
  SEQUENTIAL: "sequential",
  OPEN: "open",
};

// getters: التسمية تنقرا وقت الاستخدام، فتطلع باللغة الحالية
export const MODE_LABEL = {
  get [MODE.SEQUENTIAL]() {
    return i18n.t("common.mode.sequential");
  },
  get [MODE.OPEN]() {
    return i18n.t("common.mode.open");
  },
};

// خيارات جاهزة للفلاتر والقوائم
export const MODE_OPTIONS = [
  {
    value: MODE.SEQUENTIAL,
    get label() {
      return MODE_LABEL[MODE.SEQUENTIAL];
    },
  },
  {
    value: MODE.OPEN,
    get label() {
      return MODE_LABEL[MODE.OPEN];
    },
  },
];

// يقبل صيغة الخادم أو صيغة الواجهة ويرجّع صيغة الواجهة، أو null إذا القيمة غير معروفة
export function normalizeMode(mode) {
  if (mode === "seq" || mode === MODE.SEQUENTIAL) return MODE.SEQUENTIAL;
  if (mode === MODE.OPEN) return MODE.OPEN;
  return null;
}

// تسمية أي صيغة ("seq" أو "sequential" أو "open") باللغة الحالية
export function getModeLabel(mode, fallback = i18n.t("common.mode.unknown")) {
  return MODE_LABEL[normalizeMode(mode)] ?? fallback;
}

export const toBackendMode = (mode) =>
  normalizeMode(mode) === MODE.SEQUENTIAL ? "seq" : "open";

export const fromBackendMode = (mode) =>
  mode === "seq" ? MODE.SEQUENTIAL : MODE.OPEN;
