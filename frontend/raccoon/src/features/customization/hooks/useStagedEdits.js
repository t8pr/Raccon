import { useState } from "react";

/*
  الحفظ المؤقت للقطع (المسودة ووضع «تعديل الباقة»).

  ما نرسل كل قطعة لحالها: في وضع التعديل كل طلب /edit يستهلك تعديلًا من التعديلات المتاحة.
  «حفظ» يحفظ القطعة هنا في المتصفح بس، والضغطة الثانية (بعد التأكيد) ترسل كل القطع في طلب واحد.

  staged   { [tag_id]: إعداد القطعة كما ينتظره الخادم } (الصورة ممكن تكون ملف ما انرفع)
  count    عدد القطع المحفوظة مؤقتًا
  applyTo  يرجّع القطع مع التعديلات المؤقتة فوقها، فالنموذج والقائمة يشوفونها كأنها محفوظة
*/
export function useStagedEdits() {
  const [staged, setStaged] = useState({});

  function stage(config) {
    setStaged((previous) => ({ ...previous, [config.tag_id]: config }));
  }

  function clear() {
    setStaged({});
  }

  function applyTo(tags) {
    return tags.map((tag) => {
      const config = staged[tag.tag_id];
      if (!config) return tag;

      return {
        ...tag,
        tag_type: config.tag_type,
        content: config.content,
        is_configured: true,
        isStaged: true,
      };
    });
  }

  return {
    staged,
    count: Object.keys(staged).length,
    stage,
    clear,
    applyTo,
  };
}
