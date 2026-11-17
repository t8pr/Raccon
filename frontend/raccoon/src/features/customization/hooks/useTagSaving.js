import { useEffect, useRef, useState } from "react";
import {
  resetEvent,
  saveTagEdits,
  saveTagSetup,
  uploadHintImage,
} from "../../../shared/api/eventsApi";
import { buildAllTagsConfig, buildTagConfig } from "../utils/tagForm";

/*
  حفظ القطع ووضع التعديل.

  - المسودة (draft): الحفظ مفتوح دائمًا.
  - المتوقفة (paused): المالك يطلب «تعديل الباقة» أولًا، وكل حفظ يستهلك تعديلًا.
    إذا كان هذا آخر تعديل، يظهر تحذير ويحتاج تأكيدًا.

  الصفحة تمرّر allowed (هل الزر مسموح الآن)، والـhook يمنع الحفظ المزدوج بنفسه.
*/
export function useTagSaving({ eventId, event, refetch, tagForm, supportsTraps }) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showLastEditWarning, setShowLastEditWarning] = useState(false);
  // يمنع الضغط المزدوج قبل أن يصل isSaving للشاشة
  const savingRef = useRef(false);

  // رسالة النجاح تختفي بعد 3 ثوانٍ
  useEffect(() => {
    if (!saveSuccess) return;

    const timer = setTimeout(() => {
      setSaveSuccess("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [saveSuccess]);

  // saveAll: القطعة الحالية + بقية القطع بإعدادها المحفوظ
  async function saveTags({ allowed, saveAll = false, lastEditConfirmed = false }) {
    if (!allowed || savingRef.current || isSaving) return;

    setSaveError("");
    setSaveSuccess("");

    if (
      event.status === "paused" &&
      event.edits_remaining === 1 &&
      lastEditConfirmed !== true
    ) {
      setShowLastEditWarning(true);
      return;
    }

    setShowLastEditWarning(false);

    savingRef.current = true;
    setIsSaving(true);
    setSaveError("");

    const { selectedTag, form } = tagForm;

    try {
      const isTrap = supportsTraps && form.trap !== "none";
      let imageUrl = form.image;

      // الصورة الجديدة تُرفع أولًا، والقطعة تحفظ رابطها
      if (!isTrap && imageUrl instanceof Blob) {
        const uploaded = await uploadHintImage(imageUrl);
        if (typeof uploaded.url !== "string" || !uploaded.url) {
          throw new Error("لم يرجع الخادم رابط الصورة. حاول مرة أخرى.");
        }
        imageUrl = uploaded.url;
        // Retain the uploaded URL if saving fails, so retry does not re-upload.
        tagForm.setImage(imageUrl);
      }

      const selectedConfig = buildTagConfig(selectedTag, {
        trap: isTrap ? form.trap : "none",
        hint: form.hint,
        imageUrl,
        freezeSeconds: form.freezeSeconds,
      });
      const tagsConfig = saveAll
        ? buildAllTagsConfig(event.tags, selectedConfig)
        : [selectedConfig];

      if (event.status === "draft") {
        await saveTagSetup(eventId, tagsConfig);
      } else if (event.status === "paused") {
        await saveTagEdits(eventId, tagsConfig);
      }

      if (event.status === "paused") {
        setIsEditing(false);
      }

      await refetch(); /*get new saved data*/
      tagForm.reset();

      setSaveSuccess(
        saveAll
          ? `تم حفظ جميع القطع (${event.tags.length}) بنجاح.`
          : `انحفظت القطعة ${String(selectedTag.sequence_num).padStart(2, "0")} بنجاح`,
      );
    } catch (error) {
      setSaveError(
        error.message || (saveAll ? "تعذر حفظ جميع القطع." : "تعذر حفظ القطعة."),
      );
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  // «تعديل الباقة» لجولة متوقفة. في الصيد المفتوح تُصفَّر الجولة أولًا.
  async function startEditing({ allowed }) {
    if (!allowed) return;

    if (event.mode === "open") {
      try {
        setIsSaving(true);
        await resetEvent(eventId);
        await refetch();
      } catch (error) {
        setSaveError(error.message || "تعذر إعادة تعيين الجولة.");
        setIsSaving(false);
        return;
      } finally {
        setIsSaving(false);
      }
    }

    setIsEditing(true);
  }

  // يرجع true إذا أُلغي التعديل فعلًا
  function cancelEditing() {
    if (savingRef.current) return false;

    tagForm.reset();
    setShowLastEditWarning(false);
    setSaveError("");
    setSaveSuccess("");
    setIsEditing(false);
    return true;
  }

  function dismissLastEditWarning() {
    setShowLastEditWarning(false);
  }

  return {
    isSaving,
    saveError,
    saveSuccess,
    isEditing,
    showLastEditWarning,
    saveTags,
    startEditing,
    cancelEditing,
    dismissLastEditWarning,
  };
}
