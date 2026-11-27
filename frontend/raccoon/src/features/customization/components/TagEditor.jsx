import { Link } from "react-router-dom";
import { Smartphone } from "lucide-react";
import Button from "../../../shared/ui/Button/Button";
import Chip from "../../../shared/ui/Chip/Chip";
import HintField from "./HintField";
import ImageUploader from "./ImageUploader/ImageUploader";
import TrapField from "./TrapField";
import { useTranslation } from "react-i18next";

/*
  محرّر القطعة المختارة: التلميح، الصورة، الفخ، وأزرار الحفظ.
  وفي الطرف الثاني من الأزرار «معاينة»: يفتح صفحة معاينة صفحات السكان على هالقطعة (?tag=).
  عرض فقط: الحالة والحفظ في CustomizationPage.

  form          القيم المعروضة { hint, image, trap, freezeSeconds }
  fieldsDisabled الحقول مقفلة (جاري الحفظ، أو الباقة غير قابلة للتخصيص...)
  busy          فيه عملية جارية (حفظ / تشغيل الجولة / تجهيز صورة)
  canSave       زر «حفظ» متاح
  onSave        الصفحة تقرر: حفظ مؤقت (فيه تعديل) أو تأكيد الحفظ النهائي (ما فيه)
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
  isEditing,
  canSave,
  saveError,
  onSave,
  onCancelEditing,
}) {
  const { t } = useTranslation();
  return (
    <section className="customization-editor">
      <div className="customization-editor__header">
        <h2 id="tag-title">
          {t("customization.pieceNumber", {
            number: String(tag.sequence_num).padStart(2, "0"),
          })}
        </h2>

        <div className="customization-editor__edits">
          {/* .chip نوعه inline-flex، والـflex يحذف المسافات بين عناصره،
              فنحط النص كله في span واحد عشان تبقى المسافة قبل الرقم */}
          <Chip tone="mint" size="sm">
            <span>
              {t("customization.editsLeft")}{" "}
              <bdi dir="ltr">
                {editsRemaining}/{maxEdits}
              </bdi>
            </span>
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
        <Button onClick={onSave} loading={isSaving} disabled={!canSave || busy}>
          {t("common.save")}
        </Button>

        {isEditing && (
          <Button variant="outline" disabled={busy} onClick={onCancelEditing}>
            {t("customization.confirm.cancelEditTitle")}
          </Button>
        )}

        <Link
          to={`/customization/${eventId}/preview?tag=${encodeURIComponent(tag.tag_id)}`}
          className="ui-button ui-button--outline customization-editor__preview"
        >
          <Smartphone size={18} aria-hidden="true" />
          {t("customization.preview.open")}
        </Link>
      </div>

      {saveError && <p role="alert">{saveError}</p>}
    </section>
  );
}
