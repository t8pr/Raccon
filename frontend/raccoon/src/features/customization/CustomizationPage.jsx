import { useState } from "react";
import { useParams } from "react-router-dom";
import "./CustomizationPage.css";

import AppNavbar from "../../shared/layout/AppNavbar";
import Button from "../../shared/ui/Button";
import { useAuth } from "../../shared/auth/AuthContext";

import TagEditor from "./components/TagEditor";
import TagSelector from "./components/TagSelector";
import RoundSettings from "./components/RoundSettings";
import CustomizationConfirm from "./components/CustomizationConfirm";
import EventNameEditor from "./components/EventNameEditor";

import { useEventDetails } from "./hooks/useEventDetails";
import { useTagForm } from "./hooks/useTagForm";
import { useTagSaving } from "./hooks/useTagSaving";
import { useRoundStatus } from "./hooks/useRoundStatus";
import { useEventRename } from "./hooks/useEventRename";
import { getPermissions } from "./utils/permissions";

/*
  صفحة تخصيص الجولة: تختار قطعة، تكتب تلميحها أو تجعلها فخًا، تحفظ، ثم تبدأ الجولة.

  مصادر المنطق:
    useEventDetails  بيانات الجولة من الخادم
    useTagForm       نموذج القطعة المختارة (المحفوظ مقابل المعدَّل)
    useTagSaving     الحفظ ووضع التعديل وتحذير آخر تعديل
    useRoundStatus   بدء الجولة وإيقافها
    useEventRename   تعديل اسم الجولة من العنوان
    getPermissions   ما المسموح الآن
  الصفحة نفسها تربطها ببعض فقط.
*/
export default function CustomizationPage() {
  const { eventId } = useParams();
  const { accessToken } = useAuth();

  const eventQuery = useEventDetails(eventId);
  const event = eventQuery.data;
  const supportsTraps = event?.mode === "open";

  const tagForm = useTagForm(event?.tags ?? [], supportsTraps);
  const round = useRoundStatus({ eventId, refetch: eventQuery.refetch });
  const rename = useEventRename(eventId);
  const saving = useTagSaving({
    eventId,
    event,
    refetch: eventQuery.refetch,
    tagForm,
    supportsTraps,
  });

  // نافذة التأكيد المفتوحة: null | "saveAll" | "stopRound" | "edit"
  const [confirmation, setConfirmation] = useState(null);

  let content;

  if (!eventId) {
    content = <p>اختر جولة من صفحة باقاتي.</p>;
  } else if (!accessToken) {
    content = <p>يرجى تسجيل الدخول.</p>;
  } else if (eventQuery.isPending) {
    content = <p role="status">جاري تحميل الباقة...</p>;
  } else if (eventQuery.isError) {
    content = (
      <div role="alert">
        <p>{eventQuery.error.message}</p>

        <Button onClick={() => eventQuery.refetch()}>حاول مرة أخرى</Button>
      </div>
    );
  }

  if (content) {
    return (
      <div className="customization-view" dir="rtl">
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
    freezeIsValid: tagForm.freezeIsValid,
    isPreparingImage: tagForm.isPreparingImage,
    isSaving: saving.isSaving,
    isStarting: round.isStarting,
    isFetching: eventQuery.isFetching,
  });

  function save({ saveAll = false, lastEditConfirmed = false } = {}) {
    saving.saveTags({
      allowed:
        can.canCustomize &&
        Boolean(selectedTag) &&
        (saveAll ? can.canSaveAllTags : can.canSaveTag) &&
        !tagForm.isPreparingImage &&
        !round.isStarting,
      saveAll,
      lastEditConfirmed,
    });
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
      // The bulk confirmation already includes the remaining-edit warning.
      save({ saveAll: true, lastEditConfirmed: true });
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

    if (saving.cancelEditing()) {
      setConfirmation(null);
    }
  }

  function selectTag(tag) {
    if (can.busy) return;
    if (tag.tag_id === selectedTag?.tag_id) return;

    if (tagForm.hasChanges) {
      const shouldDiscard = window.confirm(
        "عندك تعديلات غير محفوظة. تبغى تتجاهلها وتنتقل لقطعة ثانية؟",
      );

      if (!shouldDiscard) return;
    }

    saving.dismissLastEditWarning();
    tagForm.selectTag(tag.tag_id);
  }

  return (
    <div className="customization-view" dir="rtl">
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
          isStarting={round.isStarting}
          isEditing={saving.isEditing}
          canSaveTag={can.canSaveTag}
          canSaveAllTags={can.canSaveAllTags}
          showLastEditWarning={saving.showLastEditWarning}
          saveError={saving.saveError}
          onSave={() => save()}
          onSaveAll={() => setConfirmation("saveAll")}
          onCancelEditing={cancelEditing}
          onConfirmLastEdit={() => save({ lastEditConfirmed: true })}
          onDismissLastEdit={saving.dismissLastEditWarning}
        />

        <TagSelector
          tags={event.tags}
          selectedTagId={selectedTag.tag_id}
          configuredCount={can.configuredCount}
          canCustomize={can.canCustomize}
          hasChanges={tagForm.hasChanges}
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
