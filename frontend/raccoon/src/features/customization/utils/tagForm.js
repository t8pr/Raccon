// دوال خالصة (بلا state ولا طلبات) لتحويل القطعة بين شكل الخادم وشكل نموذج التخصيص.
// CustomizationPage تحتفظ بالحالة والتدفق، وهذه الدوال تتكفّل بالتحويل فقط.
import { FREEZE_DEFAULT_SECONDS } from "../../../shared/utils/trapRules";

// نوع الفخ المحفوظ في القطعة: "none" | "freeze" | "boom" | "choose"
export function getTrapType(tag) {
  if (tag?.tag_type !== "trap") return "none";

  if (tag.content?.freeze != null) return "freeze";
  if (tag.content?.boom === 1) return "boom";
  if (tag.content?.choose === true) return "choose";

  return "none";
}

// القيم المحفوظة للقطعة كما يعرضها النموذج قبل أي تعديل
export function getSavedTagForm(tag) {
  return {
    hint: tag?.content?.hint ?? "",
    image: tag?.content?.image ?? "",
    trap: getTrapType(tag),
    freezeSeconds: tag?.content?.freeze ?? FREEZE_DEFAULT_SECONDS,
  };
}

// محتوى القطعة كما ينتظره الخادم.
// imageUrl يجب أن يكون رابطًا جاهزًا (الرفع يتم قبل استدعاء هذه الدالة).
export function buildTagContent({ trap, hint, imageUrl, freezeSeconds }) {
  if (trap === "boom") return { boom: 1 };
  if (trap === "freeze") return { freeze: Number(freezeSeconds) };
  if (trap === "choose") return { choose: true };

  const content = { hint };
  if (imageUrl) content.image = imageUrl;
  return content;
}

// إعداد قطعة واحدة للحفظ
export function buildTagConfig(tag, { trap, hint, imageUrl, freezeSeconds }) {
  const isTrap = trap !== "none";

  return {
    tag_id: tag.tag_id,
    tag_type: isTrap ? "trap" : "clue",
    content: buildTagContent({ trap, hint, imageUrl, freezeSeconds }),
  };
}

// «حفظ الكل»: القطعة الحالية بإعدادها الجديد، وبقية القطع بإعدادها المحفوظ.
// القطع غير المجهّزة تُحفظ كتلميح فارغ.
export function buildAllTagsConfig(tags, selectedConfig) {
  return tags.map((tag) =>
    tag.tag_id === selectedConfig.tag_id
      ? selectedConfig
      : {
          tag_id: tag.tag_id,
          tag_type: tag.tag_type || "clue",
          content: tag.content ? { ...tag.content } : { hint: "" },
        },
  );
}
