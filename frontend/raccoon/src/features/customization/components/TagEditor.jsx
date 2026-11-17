import Button from "../../../shared/ui/Button";
import Chip from "../../../shared/ui/Chip";
import InlineMessage from "../../../shared/ui/InlineMessage";
import HintField from "./HintField";
import ImageUploader from "./ImageUploader";
import TrapField from "./TrapField";

/*
  محرّر القطعة المختارة: التلميح، الصورة، الفخ، وأزرار الحفظ.
  عرض فقط: الحالة والحفظ في CustomizationPage.

  form          القيم المعروضة { hint, image, trap, freezeSeconds }
  fieldsDisabled الحقول مقفلة (جاري الحفظ، أو الباقة غير قابلة للتخصيص...)
  busy          فيه عملية جارية (حفظ / تشغيل الجولة / تجهيز صورة)
*/
export default function TagEditor({
  eventId,
  tag,
  editsRemaining,
  maxEdits,
  form,
  onHintChange,
  onImageChange,
  onImageBusyChange,
  onTrapChange,
  onFreezeSecondsChange,
  supportsTraps,
  fieldsDisabled,
  busy,
  isSaving,
  isStarting,
  isEditing,
  canSaveTag,
  canSaveAllTags,
  showLastEditWarning,
  saveError,
  onSave,
  onSaveAll,
  onCancelEditing,
  onConfirmLastEdit,
  onDismissLastEdit,
}) {
  return (
    <section className="customization-editor">
      <div className="customization-editor__header">
        <h2 id="tag-title">
          القطعة {String(tag.sequence_num).padStart(2, "0")}
        </h2>

        <div className="customization-editor__edits">
          <Chip tone="mint" size="sm">
            التعديلات الباقية{" "}
            <bdi dir="ltr">
              {editsRemaining}/{maxEdits}
            </bdi>
          </Chip>
        </div>
      </div>

      <HintField
        text={form.hint}
        onTextChange={onHintChange}
        disabled={fieldsDisabled}
      />

      {/* key: محرّر صورة جديد لكل قطعة حتى لا تنتقل المعاينة بين القطع */}
      <ImageUploader
        key={`${eventId}:${tag.tag_id}`}
        onBusyChange={onImageBusyChange}
        value={form.image}
        onChange={onImageChange}
        disabled={fieldsDisabled}
      />

      {supportsTraps && (
        <TrapField
          value={form.trap}
          onValueChange={onTrapChange}
          freezeSeconds={form.freezeSeconds}
          onFreezeSecondsChange={onFreezeSecondsChange}
          disabled={fieldsDisabled}
        />
      )}

      <div className="customization-editor__actions">
        <Button
          onClick={onSave}
          loading={isSaving}
          disabled={!canSaveTag || showLastEditWarning || isStarting}
        >
          احفظ القطعة
        </Button>

        <Button
          variant="outline"
          disabled={!canSaveAllTags || showLastEditWarning}
          onClick={onSaveAll}
        >
          حفظ جميع القطع
        </Button>

        {isEditing && (
          <Button variant="outline" disabled={busy} onClick={onCancelEditing}>
            إلغاء التعديل
          </Button>
        )}
      </div>

      {showLastEditWarning && (
        <div>
          <InlineMessage
            type="warning"
            message="هذا آخر تعديل متاح لك. بعد الحفظ ما تقدر تعدّل أي قطعة في الباقة. تبغى تكمل؟"
          />

          <div className="customization-editor__actions">
            <Button
              onClick={onConfirmLastEdit}
              disabled={!canSaveTag || isSaving || isStarting}
            >
              تأكيد الحفظ
            </Button>

            <Button variant="outline" onClick={onDismissLastEdit}>
              إلغاء
            </Button>
          </div>
        </div>
      )}

      {saveError && <p role="alert">{saveError}</p>}
    </section>
  );
}
