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

  // القطعة تُحفظ إذا فيها تعديل، أو إذا لم تُحفظ من قبل أبدًا
  const canSaveTag =
    Boolean(selectedTag) &&
    canCustomize &&
    freezeIsValid &&
    !isPreparingImage &&
    (hasChanges || !selectedTag.is_configured);

  const canSaveAllTags =
    event.tags.length > 0 &&
    canCustomize &&
    freezeIsValid &&
    !isPreparingImage &&
    !isSaving &&
    !isStarting &&
    !isFetching;

  // البدء يحتاج كل القطع محفوظة وبلا تعديلات معلّقة
  const canStartRound =
    (event.status === "draft" || event.status === "paused") &&
    allTagsReady &&
    !isFetching &&
    !hasChanges &&
    !isEditing &&
    !isSaving &&
    !isStarting &&
    !isPreparingImage;

  const canChangeRoundStatus = isLive ? !isSaving && !isStarting : canStartRound;

  const canRequestEdit =
    canStartEditing && !isEditing && !isSaving && !isStarting;

  const busy = isSaving || isStarting || isPreparingImage;

  return {
    isLive,
    canStartEditing,
    canCustomize,
    configuredCount,
    allTagsReady,
    canSaveTag,
    canSaveAllTags,
    canChangeRoundStatus,
    canRequestEdit,
    busy,
  };
}
