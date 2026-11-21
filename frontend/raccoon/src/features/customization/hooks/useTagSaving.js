import { useEffect, useRef, useState } from "react";
import {
  resetEvent,
  saveTagEdits,
  saveTagSetup,
  uploadHintImage,
} from "../../../shared/api/eventsApi";
import { buildAllTagsConfig, buildTagConfig } from "../utils/tagForm";

/*
  حفظ القطع ووضع التعديل. زر «حفظ» واحد له حالتين (الصفحة تقرر أي وحدة):

  1) القطعة الحالية فيها تعديل → stageTag: تنحفظ مؤقتًا في المتصفح (staging)، بدون أي طلب،
     عشان يقدر ينتقل ويعدّل باقي القطع.
  2) ما فيها تعديل → saveAllTags (بعد نافذة تأكيد): كل القطع، المؤقت فوق المحفوظ،
     في طلب واحد. المسودة (draft) ← /setup بدون حد. وضع التعديل (paused) ← /edit
     ويُستهلك تعديل واحد، حتى لو ما تعدّلت أي قطعة.

  الصفحة تمرّر allowed (هل الزر مسموح الآن)، والـhook يمنع الحفظ المزدوج بنفسه.
  staging: ما يرجّعه useStagedEdits.
*/
export function useTagSaving({
  eventId,
  event,
  refetch,
  tagForm,
  supportsTraps,
  staging,
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
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

  // إعداد القطعة المختارة من النموذج. الصورة ممكن تبقى ملف (Blob) لين يجي وقت الرفع.
  function buildSelectedConfig(imageUrl) {
    const { selectedTag, form } = tagForm;
    const isTrap = supportsTraps && form.trap !== "none";

    return buildTagConfig(selectedTag, {
      trap: isTrap ? form.trap : "none",
      hint: form.hint,
      imageUrl,
      freezeSeconds: form.freezeSeconds,
    });
  }

  // يرفع الصورة لو كانت ملف جديد، ويرجّع الإعداد برابطها
  async function withUploadedImage(config) {
    const image = config.content?.image;

    if (!(image instanceof Blob)) return config;

    const uploaded = await uploadHintImage(image);

    if (typeof uploaded.url !== "string" || !uploaded.url) {
      throw new Error("لم يرجع الخادم رابط الصورة. حاول مرة أخرى.");
    }

    return { ...config, content: { ...config.content, image: uploaded.url } };
  }

  // الحالة 1: حفظ مؤقت للقطعة الحالية (الصورة تبقى ملف لين الحفظ النهائي)
  function stageTag({ allowed }) {
    if (!allowed || savingRef.current) return;

    const tagNumber = String(tagForm.selectedTag.sequence_num).padStart(2, "0");

    staging.stage(buildSelectedConfig(tagForm.form.image));
    tagForm.reset();
    setSaveError("");
    setSaveSuccess(
      `انحفظت القطعة ${tagNumber} مؤقتًا. لما تخلص كل القطع اضغط «حفظ» مرة ثانية.`,
    );
  }

  // الحالة 2: الحفظ النهائي لكل القطع في طلب واحد
  async function saveAllTags({ allowed }) {
    if (!allowed || savingRef.current || isSaving) return;

    const isEdit = event.status === "paused";

    savingRef.current = true;
    setIsSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const configs = [];

      for (const config of buildAllTagsConfig(staging.applyTo(event.tags))) {
        const ready = await withUploadedImage(config);

        if (ready !== config) {
          // الصورة انرفعت: نحفظ رابطها في المؤقت عشان إعادة المحاولة ما ترفعها مرة ثانية
          staging.stage(ready);
        }

        configs.push(ready);
      }

      if (isEdit) {
        await saveTagEdits(eventId, configs);
      } else {
        await saveTagSetup(eventId, configs);
      }

      setIsEditing(false);
      await refetch();
      staging.clear();
      tagForm.reset();

      setSaveSuccess(
        isEdit
          ? "تم حفظ تعديلات الباقة بنجاح."
          : `تم حفظ جميع القطع (${configs.length}) بنجاح.`,
      );
    } catch (error) {
      // المؤقت يبقى، فيقدر يعيد المحاولة بدون ما يعيد التعديل
      setSaveError(
        error.message ||
          (isEdit ? "تعذر حفظ التعديلات." : "تعذر حفظ جميع القطع."),
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

  // يرجع true إذا أُلغي التعديل فعلًا. يمسح الحفظ المؤقت كذلك.
  function cancelEditing() {
    if (savingRef.current) return false;

    tagForm.reset();
    staging.clear();
    setSaveError("");
    setSaveSuccess("");
    setIsEditing(false);
    return true;
  }

  return {
    isSaving,
    saveError,
    saveSuccess,
    isEditing,
    stageTag,
    saveAllTags,
    startEditing,
    cancelEditing,
  };
}
