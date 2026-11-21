/*
  كل قرارات «مسموح / ممنوع» في صفحة التخصيص، في دالة خالصة واحدة.
  تستلم الحالة الحالية وترجع قيمًا منطقية؛ لا state ولا طلبات.

  حالات الجولة:
    draft   مسودة: التخصيص مفتوح
    paused  متوقفة: التخصيص يحتاج «تعديل الباقة» ويستهلك تعديلًا
    live    شغّالة: لا تخصيص، فقط إيقاف
*/
export function getPermissions({
  event,
  selectedTag,
  isEditing,
  hasChanges,
  hasStaged = false,
  freezeIsValid,
  isPreparingImage,
  isSaving,
  isStarting,
  isFetching,
}) {
  const isLive = event.status === "live";

  const canStartEditing =
    event.status === "paused" && event.edits_remaining > 0;

  const canCustomize =
    event.status === "draft" || (canStartEditing && isEditing);

  const configuredCount = event.tags.filter((tag) => tag.is_configured).length;

  const allTagsReady =
    event.tags.length > 0 && configuredCount === event.tags.length;

  // زر «حفظ» متاح دائمًا وقت التخصيص: بتعديل يحفظ مؤقتًا، وبدونه يحفظ الكل (بعد تأكيد)
  const canSave =
    Boolean(selectedTag) && canCustomize && freezeIsValid && !isPreparingImage;

  // البدء يحتاج كل القطع محفوظة وبلا تعديلات معلّقة (ولا حفظ مؤقت ما انرسل)
  const canStartRound =
    (event.status === "draft" || event.status === "paused") &&
    allTagsReady &&
    !isFetching &&
    !hasChanges &&
    !hasStaged &&
    !isEditing &&
    !isSaving &&
    !isStarting &&
    !isPreparingImage;

  const canChangeRoundStatus = isLive
    ? !isSaving && !isStarting
    : canStartRound;

  const canRequestEdit =
    canStartEditing && !isEditing && !isSaving && !isStarting;

  const busy = isSaving || isStarting || isPreparingImage;

  return {
    isLive,
    canStartEditing,
    canCustomize,
    configuredCount,
    allTagsReady,
    canSave,
    canChangeRoundStatus,
    canRequestEdit,
    busy,
  };
}
