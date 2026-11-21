import { useState } from "react";
import { isValidFreezeSeconds } from "../../../shared/utils/trapRules";
import { getSavedTagForm } from "../utils/tagForm";

/*
  نموذج القطعة المختارة.
  كل حقل يبدأ null = «بلا تعديل»، فيُعرض المحفوظ في الخادم.
  أول ما يكتب المستخدم يصير للحقل قيمة، ويُعرض تعديله بدل المحفوظ.

  tags           قطع الجولة ([] أثناء التحميل)
  supportsTraps  الصيد المفتوح فقط يدعم الفخاخ
*/
export function useTagForm(tags, supportsTraps) {
  const [selectedTagId, setSelectedTagId] = useState(null);
  const [hint, setHint] = useState(null);
  const [image, setImage] = useState(null);
  const [trap, setTrap] = useState(null);
  const [freezeSeconds, setFreezeSeconds] = useState(null);
  const [isPreparingImage, setIsPreparingImage] = useState(false);

  // أول قطعة افتراضيًا، أو المختارة إن كانت ما زالت موجودة
  const selectedTag =
    selectedTagId === null
      ? tags[0]
      : (tags.find((tag) => tag.tag_id === selectedTagId) ?? tags[0]);

  const saved = getSavedTagForm(selectedTag);

  const form = {
    hint: hint ?? saved.hint,
    image: image ?? saved.image,
    trap: trap ?? saved.trap,
    freezeSeconds: freezeSeconds ?? saved.freezeSeconds,
  };

  const trapHasChanges =
    form.trap !== saved.trap ||
    (form.trap === "freeze" &&
      Number(form.freezeSeconds) !== Number(saved.freezeSeconds));

  // القطعة الفخ لا تحمل تلميحًا ولا صورة، فتعديلهما لا يُحسب
  const isTrapSelected = supportsTraps && form.trap !== "none";
  const hasChanges =
    trapHasChanges ||
    (!isTrapSelected && (form.hint !== saved.hint || form.image !== saved.image));

  const freezeIsValid =
    form.trap !== "freeze" || isValidFreezeSeconds(form.freezeSeconds);

  // يمسح التعديلات غير المحفوظة فيرجع النموذج لقيم القطعة المحفوظة
  function reset() {
    setHint(null);
    setImage(null);
    setTrap(null);
    setFreezeSeconds(null);
  }

  function selectTag(tagId) {
    setSelectedTagId(tagId);
    reset();
  }

  return {
    selectedTag,
    form,
    hasChanges,
    freezeIsValid,
    isTrapSelected,
    isPreparingImage,
    setIsPreparingImage,
    setHint,
    setImage,
    setTrap,
    setFreezeSeconds,
    reset,
    selectTag,
  };
}
