import { useState } from "react";
import { useParams } from "react-router-dom";
import "./CustomizationPage.css";

import AppNavbar from "../../shared/layout/AppNavbar/AppNavbar";
import Button from "../../shared/ui/Button/Button";
import { useAuth } from "../../shared/auth/AuthContext";

import TagEditor from "./components/TagEditor";
import TagSelector from "./components/TagSelector";
import RoundSettings from "./components/RoundSettings";
import CustomizationConfirm from "./components/CustomizationConfirm/CustomizationConfirm";
import EventNameEditor from "./components/EventNameEditor";

import { useEventDetails } from "./hooks/useEventDetails";
import { useTagForm } from "./hooks/useTagForm";
import { useTagSaving } from "./hooks/useTagSaving";
import { useStagedEdits } from "./hooks/useStagedEdits";
import { useRoundStatus } from "./hooks/useRoundStatus";
import { useEventRename } from "./hooks/useEventRename";
import { getPermissions } from "./utils/permissions";
import { useTranslation } from "react-i18next";

/*
  صفحة تخصيص الجولة: تختار قطعة، تكتب تلميحها أو تجعلها فخًا، تحفظ، ثم تبدأ الجولة.

  مصادر المنطق:
    useEventDetails  بيانات الجولة من الخادم
    useTagForm       نموذج القطعة المختارة (المحفوظ مقابل المعدَّل)
    useStagedEdits   الحفظ المؤقت للقطع (لين الحفظ النهائي)
    useTagSaving     الحفظ المؤقت، والحفظ النهائي، ووضع التعديل
    useRoundStatus   بدء الجولة وإيقافها
    useEventRename   تعديل اسم الجولة من العنوان
    getPermissions   ما المسموح الآن
  الصفحة نفسها تربطها ببعض فقط.
*/
export default function CustomizationPage() {
  const { eventId } = useParams();
  const { accessToken } = useAuth();

  const eventQuery = useEventDetails(eventId);
  const { t } = useTranslation();
  const event = eventQuery.data;
  const supportsTraps = event?.mode === "open";

  // القطع مع التعديلات المؤقتة فوقها: النموذج والقائمة يشوفونها كأنها محفوظة
  const staging = useStagedEdits();
  const tags = staging.applyTo(event?.tags ?? []);

  const tagForm = useTagForm(tags, supportsTraps);
  const round = useRoundStatus({ eventId, refetch: eventQuery.refetch });
  const rename = useEventRename(eventId);
  const saving = useTagSaving({
    eventId,
    event,
    refetch: eventQuery.refetch,
    tagForm,
    supportsTraps,
    staging,
  });

  // نافذة التأكيد المفتوحة: null | "saveAll" | "cancelEdit" | "stopRound" | "edit"
  const [confirmation, setConfirmation] = useState(null);

  let content;

  if (!eventId) {
    content = <p>{t("customization.pickRound")}</p>;
  } else if (!accessToken) {
    content = <p>{t("customization.pleaseLogin")}</p>;
  } else if (eventQuery.isPending) {
    content = <p role="status">{t("customization.loading")}</p>;
  } else if (eventQuery.isError) {
    content = (
      <div role="alert">
        <p>{eventQuery.error.message}</p>

        <Button onClick={() => eventQuery.refetch()}>{t("common.tryAgainOther")}</Button>
      </div>
    );
  }

  if (content) {
    return (
      <div className="customization-view">
        <AppNavbar />

        <div className="customization-empty">{content}</div>
      </div>
    );
  }

  const { selectedTag } = tagForm;

  const can = getPermissions({
    event,
    selectedTag,
    isEditing: saving.isEditing,
    hasChanges: tagForm.hasChanges,
    hasStaged: staging.count > 0,
    freezeIsValid: tagForm.freezeIsValid,
    isPreparingImage: tagForm.isPreparingImage,
    isSaving: saving.isSaving,
    isStarting: round.isStarting,
    isFetching: eventQuery.isFetching,
  });

  /*
    زر «حفظ» (المسودة ووضع التعديل):
      القطعة الحالية فيها تعديل → حفظ مؤقت، ويقدر ينتقل لقطعة ثانية
      ما فيها تعديل            → نافذة تأكيد، ثم حفظ كل القطع في طلب واحد
  */
  function pressSave() {
    if (!can.canSave || can.busy) return;

    if (tagForm.hasChanges) {
      saving.stageTag({ allowed: true });
    } else {
      setConfirmation("saveAll");
    }
  }

  function changeRoundStatus() {
    if (!can.canChangeRoundStatus) return;

    round.changeStatus(can.isLive ? "paused" : "live");
  }

  // الجولة الشغّالة تحتاج تأكيدًا قبل الإيقاف؛ البدء مباشر
  function toggleRound() {
    if (!can.canChangeRoundStatus) return;

    if (can.isLive) {
      setConfirmation("stopRound");
    } else {
      changeRoundStatus();
    }
  }

  function requestEdit() {
    if (!can.canRequestEdit) return;

    setConfirmation("edit");
  }

  function confirmAction() {
    const action = confirmation;
    setConfirmation(null);

    if (action === "saveAll") {
      saving.saveAllTags({
        allowed: can.canCustomize && !can.busy && !tagForm.hasChanges,
      });
    } else if (action === "cancelEdit") {
      if (!can.busy) saving.cancelEditing();
    } else if (action === "stopRound") {
      changeRoundStatus();
    } else if (action === "edit") {
      saving.startEditing({
        allowed:
          can.canStartEditing &&
          !saving.isEditing &&
          !saving.isSaving &&
          !round.isStarting &&
          !tagForm.isPreparingImage,
      });
    }
  }

  function cancelEditing() {
    if (can.busy) return;

    // الإلغاء يمسح الحفظ المؤقت وتعديل القطعة الحالية، فنسأل أول (نافذة تأكيد) لو فيه شي بيروح
    if (staging.count > 0 || tagForm.hasChanges) {
      setConfirmation("cancelEdit");
      return;
    }

    saving.cancelEditing();
  }

  function selectTag(tag) {
    if (can.busy) return;
    if (tag.tag_id === selectedTag?.tag_id) return;

    if (tagForm.hasChanges) {
      const shouldDiscard = window.confirm(
        t("customization.discardConfirm"),
      );

      if (!shouldDiscard) return;
    }

    tagForm.selectTag(tag.tag_id);
  }

  return (
    <div className="customization-view">
      <AppNavbar />

      {saving.saveSuccess && (
        <div className="customization-toast" role="status">
          <span>{saving.saveSuccess}</span>
        </div>
      )}

      <CustomizationConfirm
        action={confirmation}
        status={event.status}
        editsRemaining={event.edits_remaining}
        onConfirm={confirmAction}
        onCancel={() => setConfirmation(null)}
      />

      <div className="customization-space">
        <EventNameEditor title={event.title} rename={rename} />

        <TagEditor
          eventId={eventId}
          tag={selectedTag}
          editsRemaining={event.edits_remaining}
          maxEdits={event.max_edits}
          form={tagForm.form}
          onHintChange={tagForm.setHint}
          onImageChange={tagForm.setImage}
          onImageBusyChange={tagForm.setIsPreparingImage}
          onTrapChange={tagForm.setTrap}
          onFreezeSecondsChange={tagForm.setFreezeSeconds}
          supportsTraps={supportsTraps}
          fieldsDisabled={can.busy || !can.canCustomize}
          busy={can.busy}
          isSaving={saving.isSaving}
          isEditing={saving.isEditing}
          canSave={can.canSave}
          saveError={saving.saveError}
          onSave={pressSave}
          onCancelEditing={cancelEditing}
        />

        <TagSelector
          tags={tags}
          selectedTagId={selectedTag.tag_id}
          configuredCount={can.configuredCount}
          canCustomize={can.canCustomize}
          disabled={can.busy}
          onSelect={selectTag}
        >
          <RoundSettings
            isLive={can.isLive}
            isStarting={round.isStarting}
            canChangeRoundStatus={can.canChangeRoundStatus}
            canRequestEdit={can.canRequestEdit}
            allTagsReady={can.allTagsReady}
            startError={round.startError}
            onToggleRound={toggleRound}
            onRequestEdit={requestEdit}
          />
        </TagSelector>
      </div>
    </div>
  );
}
