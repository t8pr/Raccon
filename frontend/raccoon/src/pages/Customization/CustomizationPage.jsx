import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import "../../styles/CustomizationPage.css";

import AppNavbar from "../../components/layout/AppNavbar";
import Button from "../../components/ui/Button";
import HintField from "../../components/ui/HintField";
import TrapField from "../../components/ui/TrapField";
import Chip from "../../components/ui/Chip";
import InlineMessage from "../../components/ui/InlineMessage";
import ClassTag from "../../components/ui/classTag";
import TagLegend from "../../components/ui/TagLegend";

import { GetEventDetails } from "../../api/events/eventsApi";
import { SaveTagSetup } from "../../api/events/eventsApi";
import { UpdateEventStatus } from "../../api/events/eventsApi";
import { SaveTagEdits } from "../../api/events/eventsApi";
import { useAuth } from "../../context/AuthContext";
import ImageUploader from "../../components/ui/ImageUploader";

function getTrapType(tag) {
  if (tag.tag_type !== "trap") return "none";

  if (tag.content?.freeze != null) return "freeze";
  if (tag.content?.boom === 1) return "boom";
  if (tag.content?.choose === true) return "choose";

  return "none";
}

export default function CustomizationPage() {
  const { eventId } = useParams();
  const { accessToken } = useAuth();

  const [selectedTagId, setSelectedTagId] = useState(null);
  const [hint, setHint] = useState(null);
  const [image, setImage] = useState(null);
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

        <Button onClick={() => eventQuery.refetch()}>حاول مرة أخرى</Button>
      </div>
    );
  } else {
    const eventData = eventQuery.data;

    const canStartEditing =
      eventData.status === "paused" && eventData.edits_remaining > 0;

    const canCustomize =
      eventData.status === "draft" || (canStartEditing && isEditing);

    const configuredCount = eventData.tags.filter(
      (tag) => tag.is_configured,
    ).length;

    const allTagsReady =
      eventData.tags.length > 0 && configuredCount === eventData.tags.length;

    const selectedTag =
      selectedTagId === null
        ? eventData.tags[0]
        : (eventData.tags.find((tag) => tag.tag_id === selectedTagId) ??
          eventData.tags[0]);

    const savedHint = selectedTag?.content?.hint ?? "";
    const displayedHint = hint ?? savedHint;
    const savedImage = selectedTag?.content?.image ?? "";
    const displayedImage = image ?? savedImage;
    const supportsTraps = eventData.mode === "open";

    let savedTrap = "none";

    if (selectedTag?.tag_type === "trap") {
      if (selectedTag.content?.freeze != null) {
        savedTrap = "freeze";
      } else if (selectedTag.content?.boom === 1) {
        savedTrap = "boom";
      } else if (selectedTag.content?.choose === true) {
        savedTrap = "choose";
      }
    }

    const displayedTrap = trap ?? savedTrap;

    const savedFreezeSeconds = selectedTag?.content?.freeze ?? 60;

    const displayedFreezeSeconds = freezeSeconds ?? savedFreezeSeconds;

    const hintHasChanges = displayedHint !== savedHint;
    const imageHasChanges = displayedImage !== savedImage;

    const trapHasChanges =
      displayedTrap !== savedTrap ||
      (displayedTrap === "freeze" &&
        Number(displayedFreezeSeconds) !== Number(savedFreezeSeconds));

    const isTrapSelected = supportsTraps && displayedTrap !== "none";
    const hasChanges = trapHasChanges || (!isTrapSelected && (hintHasChanges || imageHasChanges));

    const duration = Number(displayedFreezeSeconds);

    const freezeIsValid =
      displayedTrap !== "freeze" ||
      (String(displayedFreezeSeconds).trim() !== "" &&
        Number.isInteger(duration) &&
        duration >= 1 &&
        duration <= 180);

    const canSaveTag =
      Boolean(selectedTag) &&
      canCustomize &&
      freezeIsValid &&
      (hasChanges || !selectedTag.is_configured);

    const canStartRound =
      (eventData.status === "draft" || eventData.status === "paused") &&
      allTagsReady &&
      !eventQuery.isFetching &&
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

      let tagContent;

      if (!isTrap) {
        tagContent = {
          hint: displayedHint,
        };
        if (displayedImage) {
          tagContent.image = displayedImage;
        }
      } else if (displayedTrap === "boom") {

        if (selectedTag.content?.image != null) {
          tagContent.image = selectedTag.content.image;
        }
      } else if (displayedTrap === "boom") {
        tagContent = { boom: 1 };
      } else if (displayedTrap === "freeze") {
        tagContent = {
          freeze: Number(displayedFreezeSeconds),
        };
      } else {
        tagContent = { choose: true };
      }

      const tagsConfig = [
        {
          tag_id: selectedTag.tag_id,
          tag_type: isTrap ? "trap" : "clue",
          content: tagContent,
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
        setImage(null);
        setTrap(null);
        setFreezeSeconds(null);

        setSaveSuccess(
          `انحفظت القطعة ${String(selectedTag.sequence_num).padStart(2, "0")} بنجاح`,
        );
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
          "عندك تعديلات غير محفوظة. تبغى تتجاهلها وتنتقل لقطعة ثانية؟",
        );

        if (!shouldDiscard) return;
      }

      setShowLastEditWarning(false);

      setSelectedTagId(tag.tag_id);
      setHint(null);
      setImage(null);
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
          <div className="customization-toast" role="status">
            <span>{saveSuccess}</span>
          </div>
        )}

        <div className="customization-space">
          <header className="customization-heading">
            <h1>تخصيص {eventData.title}</h1>
          </header>

          <section className="customization-editor">
            <div className="customization-editor__header">
              <h2 id="tag-title">
                القطعة {String(selectedTag.sequence_num).padStart(2, "0")}
              </h2>

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
            {/* image uplaadre component*/}
            <ImageUploader
              value={displayedImage}
              onChange={setImage}
              disabled={isSaving || !canCustomize || isStarting}
            />

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
                disabled={!canSaveTag || showLastEditWarning || isStarting}
              >
                احفظ القطعة
              </Button>

              <Button variant="outline" disabled>
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
                    disabled={!canSaveTag || isSaving || isStarting}
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

          <section className="Tag-Selector">
            <div className="tag-progress__label">
              <span>القطع الجاهزة</span>

              <strong>
                {configuredCount} من {eventData.tags.length}
              </strong>
            </div>

            <progress
              className="tag-progress"
              value={configuredCount}
              max={Math.max(eventData.tags.length, 1)}
              aria-label="القطع الجاهزة"
            />

            <div className="class-tag-grid">
              {eventData.tags.map((tag) => (
                <ClassTag
                  key={tag.tag_id}
                  number={tag.sequence_num}
                  configured={Boolean(tag.is_configured)}
                  selected={
                    selectedTag.tag_id === tag.tag_id &&
                    canCustomize &&
                    (hasChanges || !tag.is_configured)
                  }
                  trapType={getTrapType(tag)}
                  disabled={isSaving || isStarting}
                  onClick={() => handleSelectTag(tag)}
                />
              ))}
            </div>

            <TagLegend />

            <section className="Round-settings">
              <h2>إعدادات الجولة</h2>

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
                    if (
                      !canStartEditing ||
                      isEditing ||
                      isSaving ||
                      isStarting
                    ) {
                      return;
                    }

                    setIsEditing(true);
                  }}
                  disabled={
                    !canStartEditing || isEditing || isSaving || isStarting
                  }
                >
                  تعديل الباقة
                </Button>
              </div>

              {!isLive && !allTagsReady && (
                <p className="customization-note">
                  احفظ جميع القطع لتتمكن من بدء الجولة، حتى القطع الفارغة.
                </p>
              )}

              {startError && <p role="alert">{startError}</p>}
            </section>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="customization-view" dir="rtl">
      <AppNavbar />

      <div className="customization-empty">{content}</div>
    </div>
  );
}
