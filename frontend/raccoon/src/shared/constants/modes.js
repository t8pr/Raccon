// نوع التجربة (الوضع): المكان الوحيد لتسمياته وتحويلاته.
// الخادم يستخدم "seq" / "open"، والواجهة تستخدم "sequential" / "open".

export const MODE = {
  SEQUENTIAL: "sequential",
  OPEN: "open",
};

export const MODE_LABEL = {
  [MODE.SEQUENTIAL]: "تسلسلي",
  [MODE.OPEN]: "صيد مفتوح",
};

// خيارات جاهزة للفلاتر والقوائم
export const MODE_OPTIONS = [
  { value: MODE.SEQUENTIAL, label: MODE_LABEL[MODE.SEQUENTIAL] },
  { value: MODE.OPEN, label: MODE_LABEL[MODE.OPEN] },
];

// يقبل صيغة الخادم أو صيغة الواجهة ويرجّع صيغة الواجهة، أو null إذا القيمة غير معروفة
export function normalizeMode(mode) {
  if (mode === "seq" || mode === MODE.SEQUENTIAL) return MODE.SEQUENTIAL;
  if (mode === MODE.OPEN) return MODE.OPEN;
  return null;
}

// التسمية العربية لأي صيغة ("seq" أو "sequential" أو "open")
export function getModeLabel(mode, fallback = "غير محدد") {
  return MODE_LABEL[normalizeMode(mode)] ?? fallback;
}

export const toBackendMode = (mode) =>
  normalizeMode(mode) === MODE.SEQUENTIAL ? "seq" : "open";

export const fromBackendMode = (mode) =>
  mode === "seq" ? MODE.SEQUENTIAL : MODE.OPEN;
