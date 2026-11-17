// قراءة ردود الخادم في شاشة المسح. دوال خالصة بلا state.

// رقم القطعة بخانتين: 7 → "07"
export const padTag = (value) => String(value ?? "").padStart(2, "0");

// يحوّل خطأ الطلب إلى { code, message, ... } موحّد.
// الخادم يرجّع detail ككائن فيه code، أو كنص فقط، أو لا شيء.
export function toScanError(error) {
  const detail = error.detail;

  if (typeof detail === "string") {
    return { code: "unknown", message: detail };
  }

  return detail || { code: "unknown", message: "تعذر قراءة البطاقة." };
}

/*
  نوع الخطأ لاختيار الشاشة:
    already_scanned · claimed_by_another_player · freeze · skipped_tag  (لها code من الخادم)
    not_live · not_yours · completed  (نص فقط، نعرفها من الرسالة)
    unknown
*/
export function getErrorKind(scanError) {
  const message = scanError?.message ?? "";

  if (scanError?.code && scanError.code !== "unknown") return scanError.code;
  if (message === "This event is not live.") return "not_live";
  if (message.startsWith("Security Violation")) return "not_yours";
  if (message.startsWith("You have already completed")) return "completed";
  return "unknown";
}

// "Sorry, {name} claimed this tag before you!" → name
export function getClaimerName(message) {
  return message?.match(/^Sorry, (.+) claimed/)?.[1];
}

// "Skipped tag! You must scan tag {n} first." → n
export function getExpectedTag(message) {
  return message?.match(/\d+/)?.[0];
}
