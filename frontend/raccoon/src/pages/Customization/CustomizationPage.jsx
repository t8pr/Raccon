import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import AppNavbar from "../../components/layout/AppNavbar";
import Button from "../../components/ui/Button";
import HintField from "../../components/ui/HintField"

import { GetEventDetails } from "../../api/EventApi";
import { SaveTagSetup } from "../../api/EventApi";
import { StartRound } from "../../api/EventApi";
import { useAuth } from "../../context/AuthContext";


/*async function handleSaveButton({ eventId, accessToken }){
  const eventData = await GetEventDetails(eventId, accessToken)

  const eventStatus = eventData.status;
  const selectedTag = eventData.tags.find(
  (tag) => tag.tag_id === selectedTagId
  );
}*/

async function handleStartRound({ eventId, accessToken }){
  const response = await StartRound(eventId, accessToken)

}

export default function CustomizationPage() {
  const { eventId } = useParams();
  const { accessToken } = useAuth();
  const [selectedTagId, setSelectedTagId] = useState(null);
  const [hint, setHint] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const eventQuery = useQuery({
  queryKey: ["event", eventId, accessToken],
  queryFn: () => GetEventDetails(eventId, accessToken),
  enabled: Boolean(eventId && accessToken),
  });

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

      <Button onClick={() => eventQuery.refetch()}>
        حاول مرة أخرى
      </Button>
    </div>
    );
  } else {
  const eventData = eventQuery.data;

  const selectedTag =
    selectedTagId === null
    ? eventData.tags[0]
    : eventData.tags.find((tag) => tag.tag_id === selectedTagId);

  const savedHint = selectedTag?.content?.hint ?? "";

  const displayedHint = hint ?? savedHint;

  const hasChanges = displayedHint !== savedHint;

  async function handleSavedTag() {
    if (
      eventData.status !== "draft" ||
      !selectedTag ||
      !hasChanges ||
      isSaving
    ) {
    return;
    }

    setIsSaving(true);
    setSaveError("");

    const tagsConfig = [
    {
      tag_id: selectedTag.tag_id,
      tag_type: selectedTag.tag_type ?? "clue",
      content: {
        ...selectedTag.content, /*for perserving content like image*/
        hint: displayedHint,
      },
    },
  ];

  try {
    await SaveTagSetup(eventId, accessToken, tagsConfig);

    await eventQuery.refetch(); /*get new saved data*/
    setHint(null);

  } catch (error) {
    setSaveError(error.message || "تعذر حفظ القطعة.");
  } finally {
    setIsSaving(false);
  }
}
  
  function handleSelectTag(tag) {
    if (isSaving) return;
    if (tag.tag_id === selectedTag?.tag_id) return;

  if (hasChanges) {
    const shouldDiscard = window.confirm(
      "عندك تعديلات غير محفوظة. تبغى تتجاهلها وتنتقل لقطعة ثانية؟"
    );

    if (!shouldDiscard) return;
  }

  setSelectedTagId(tag.tag_id);
  setHint(null);
}
  /*
  const canEditTags =
  eventStatus === "draft" || eventStatus === "paused";

  const canSave =
  hasChanges &&
  canEditTags &&
  !isSaving &&
  Boolean(eventId) &&
  Boolean(accessToken);*/

  if (!eventId) {
  return (
    <div className="customization-view" dir="rtl">
      <AppNavbar />
      <p>اختر باقه من صفحة باقاتي لفتح التخصيص.</p>
    </div>
  );
}

  return (
    <div className="customization-view" dir="rtl">
      <AppNavbar />

      <div className="customization-space">

      <section className="customization-editor">
        <div className="customization-editor__header">
          <h2 id="tag-title">{selectedTag.sequence_num} القطعة</h2>
          <p id="tag-indicator">تعدّل القطعة {selectedTag.sequence_num} من {eventData.tags.length}</p>
        </div>

        <HintField 
        text={displayedHint} 
        onTextChange={setHint}
        disabled={isSaving}
        />
       
        {/* image uploadre component*/}
        <div className="ImageUploader">soon</div>

        <div className="customization-editor__actions">
          <Button
            onClick={handleSavedTag}
            loading={isSaving}
            disabled={
              eventData.status !== "draft" ||
              !selectedTag ||
              !hasChanges
            }
          >
            احفظ القطعة
          </Button>
          <Button
            /*onClick={handlePreview}*/
            disabled
          >
            معاينة 
          </Button>
        </div>

        {saveError && <p role="alert">{saveError}</p>}
      </section>

      <section className="Round-settings">
        <h2>إعدادات الجولة</h2>

        <div className="Round-settings__content">
          {/* idk whats in here */}
        </div>

        <div className="Round-settings__actions">
          <Button
            /*onClick={handleStartRound}*/
            disabled
          >
            ابدأ الجولة
          </Button>
        </div>
      </section>

      <section className="Tag-Selector">
        <h2 className="Tag-Selector__title">{eventData.title}</h2>

      {eventData.tags.map((tag) => (
      <button
        key={tag.tag_id}
        type="button"
        onClick={() => handleSelectTag(tag)}
        disabled={isSaving}
      >
       القطعة {tag.sequence_num}
        {selectedTag?.tag_id === tag.tag_id && " ✓"}
      </button>
      ))}

      </section>
    </div>
    </div>
  );
}

return (
  <div className="customization-view" dir="rtl">
    <AppNavbar />
    {content}
  </div>
);
}