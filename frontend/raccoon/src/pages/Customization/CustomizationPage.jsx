import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import AppNavbar from "../../components/layout/AppNavbar";
import Button from "../../components/ui/Button";
import HintField from "../../components/ui/HintField"
import TrapField from "../../components/ui/TrapField";
import Chip from "../../components/ui/Chip";
import InlineMessage from "../../components/ui/InlineMessage";

import { GetEventDetails } from "../../api/events/eventsApi";
import { SaveTagSetup } from "../../api/events/eventsApi";
import { UpdateEventStatus } from "../../api/events/eventsApi";
import { SaveTagEdits } from "../../api/events/eventsApi";
import { useAuth } from "../../context/AuthContext";


export default function CustomizationPage() {
  const { eventId } = useParams();
  const { accessToken } = useAuth();

  const [selectedTagId, setSelectedTagId] = useState(null);
  const [hint, setHint] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [trap, setTrap] = useState(null);
  const [freezeSeconds, setFreezeSeconds] = useState(null);
  const [showLastEditWarning, setShowLastEditWarning] = useState(false);

  useEffect(() => {
  if (!saveSuccess) return;

  const timer = setTimeout(() => {
    setSaveSuccess("");
  }, 3000);

  return () => clearTimeout(timer);
  }, [saveSuccess]);

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

  const canStartEditing =
    eventData.status === "paused" &&
    eventData.edits_remaining > 0;

  const canCustomize =
    eventData.status === "draft" ||
    (canStartEditing && isEditing);

  const selectedTag =
    selectedTagId === null
    ? eventData.tags[0]
    : eventData.tags.find((tag) => tag.tag_id === selectedTagId);

  const savedHint = selectedTag?.content?.hint ?? "";

  const displayedHint = hint ?? savedHint;

  const supportsTraps = eventData.mode === "open";

  const savedTrap =
    selectedTag?.tag_type !== "trap"
      ? "none"
      : selectedTag.content?.freeze != null
        ? "freeze"
        : selectedTag.content?.boom === 1
          ? "boom"
          : selectedTag.content?.choose === true
            ? "choose"
            : "none";

  const displayedTrap = trap ?? savedTrap;

  const savedFreezeSeconds = selectedTag?.content?.freeze ?? 60;

  const displayedFreezeSeconds =
    freezeSeconds ?? savedFreezeSeconds;

  const hintHasChanges = displayedHint !== savedHint;

  const trapHasChanges =
    displayedTrap !== savedTrap ||
    (displayedTrap === "freeze" &&
      Number(displayedFreezeSeconds) !== Number(savedFreezeSeconds));

  const isTrapSelected =
  supportsTraps && displayedTrap !== "none";

  const hasChanges =
    trapHasChanges ||
    (!isTrapSelected && hintHasChanges);

  const canStartRound =
    (eventData.status === "draft" ||
      eventData.status === "paused") &&
    !hasChanges &&
    !isEditing &&
    !isSaving &&
    !isStarting;

  const isLive = eventData.status === "live";

  const canChangeRoundStatus = isLive
    ? !isSaving && !isStarting
    : canStartRound;

  async function handleRoundStatusChange() {
    if (!canChangeRoundStatus) return;

    setIsStarting(true);
    setStartError("");

    const nextStatus = isLive ? "paused" : "live";

    try {
      await UpdateEventStatus(eventId, accessToken, nextStatus);
      await eventQuery.refetch();
    } catch (error) {
      setStartError(error.message || "تعذر تحديث حالة الجولة.");
    } finally {
      setIsStarting(false);
    }
  }

  async function handleSavedTag(lastEditConfirmed = false) {
    if (
      !canCustomize ||
      !selectedTag ||
      !hasChanges ||
      isSaving ||
      isStarting
    ) {
    return;
    }
    
    setSaveError("");
    setSaveSuccess("");

    if (
    eventData.status === "paused" &&
    eventData.edits_remaining === 1 &&
    lastEditConfirmed !== true
    ) {
      setShowLastEditWarning(true);
      return;
    }

    setShowLastEditWarning(false);

    setIsSaving(true);
    setSaveError("");

    const isTrap = supportsTraps && displayedTrap !== "none";

    let content;

    if (!isTrap) {
      content = {
        ...selectedTag.content,
        hint: displayedHint,
      };
    } else if (displayedTrap === "boom") {
      content = { boom: 1 };
    } else if (displayedTrap === "freeze") {
      content = { freeze: Number(displayedFreezeSeconds) };
    } else {
      content = { choose: true };
    }

    const tagsConfig = [
      {
        tag_id: selectedTag.tag_id,
        tag_type: isTrap ? "trap" : "clue",
        content,
      },
    ];

  try {
    if (eventData.status === "draft") {
      await SaveTagSetup(eventId, accessToken, tagsConfig);
    } else if (eventData.status === "paused") {
      await SaveTagEdits(eventId, accessToken, tagsConfig);
    }   

    if (eventData.status === "paused") {
      setIsEditing(false);
    }

    await eventQuery.refetch(); /*get new saved data*/
    setHint(null);
    setTrap(null);
    setFreezeSeconds(null);

    setSaveSuccess(
    `انحفظت القطعة ${String(selectedTag.sequence_num).padStart(2, "0")} بنجاح`
    );

  } catch (error) {
    setSaveError(error.message || "تعذر حفظ القطعة.");
  } finally {
    setIsSaving(false);
    }
  }

  function handleResetHint() {
    if (isSaving || isStarting) return;

    setHint(null);
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

  setShowLastEditWarning(false);

  setSelectedTagId(tag.tag_id);
  setHint(null);
  setTrap(null);
  setFreezeSeconds(null);
}

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

      {saveSuccess && (
        <div className="customization-toast" role="status" dir="rtl">
          <span aria-hidden="true">✓</span>
          <span>{saveSuccess}</span>
        </div>
      )}

      <div className="customization-space">

      <section className="customization-editor">
        <div className="customization-editor__header">
          <h2 id="tag-title">
            القطعة {String(selectedTag.sequence_num).padStart(2, "0")}
          </h2>

          <p id="tag-indicator">تعدّل القطعة {selectedTag.sequence_num} من {eventData.tags.length}</p>

          <div className="customization-editor__edits">
          <Chip tone="mint" size="sm">
            التعديلات الباقية{" "}
            <bdi dir="ltr">
              {eventData.edits_remaining}/{eventData.max_edits}
            </bdi>
          </Chip>
          </div>
        </div>

        <HintField 
        text={displayedHint} 
        onTextChange={setHint}
        disabled={isSaving || !canCustomize || isStarting}
        />
       
        {/* image uploadre component*/}
        <div className="ImageUploader">soon</div>

        {supportsTraps && (
        <TrapField
          value={displayedTrap}
          onValueChange={setTrap}
          freezeSeconds={displayedFreezeSeconds}
          onFreezeSecondsChange={setFreezeSeconds}
          disabled={isSaving || isStarting || !canCustomize}
        />
        )}

        <div className="customization-editor__actions">
          <Button
            onClick={() => handleSavedTag()}
            loading={isSaving}
            disabled={
              !canCustomize ||
              !selectedTag ||
              !hasChanges ||
              showLastEditWarning ||
              isStarting
              
            }
          >
            احفظ القطعة
          </Button>

          <Button
          variant="outline"
          onClick={handleResetHint}
          disabled={isSaving || isStarting || displayedHint === savedHint}
        >
          إعادة تعيين النص
        </Button>

          <Button
            /*onClick={handlePreview}*/
            disabled
          >
            معاينة 
          </Button>
        </div>

        {showLastEditWarning && (
        <div>
          <InlineMessage
            type="warning"
            message="هذا آخر تعديل متاح لك. بعد الحفظ ما تقدر تعدّل أي قطعة في الباقة. تبغى تكمل؟"
          />

          <div className="customization-editor__actions">
            <Button
              onClick={() => handleSavedTag(true)}
              disabled={!canCustomize || !hasChanges || isSaving || isStarting}
            >
              تأكيد الحفظ
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowLastEditWarning(false)}
            >
              إلغاء
            </Button>
          </div>
        </div>
      )}

        {saveError && <p role="alert">{saveError}</p>}
      </section>

      <section className="Round-settings">
        <h2>إعدادات الجولة</h2>

        <div className="Round-settings__content">
          {/* idk whats in here */}
        </div>

        <div className="Round-settings__actions">
          <Button
            onClick={handleRoundStatusChange}
            loading={isStarting}
            disabled={!canChangeRoundStatus}
            variant={isLive ? "danger" : "primary"}
            >
            {isLive ? "إنهاء الجولة" : "ابدأ الجولة"}
          </Button>

          <Button
            onClick={() => {
            if (!canStartEditing || isEditing || isSaving || isStarting) return;
              setIsEditing(true);
            }}
            disabled={!canStartEditing || isEditing || isSaving || isStarting}
            >
             تعديل الباقة
          </Button>
        </div>
        {startError && <p role="alert">{startError}</p>}
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