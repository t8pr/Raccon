import { Dialog } from "radix-ui";
import { X, Check } from "lucide-react";

import Button from "../../../shared/ui/Button";
import AuthField from "../../../shared/ui/AuthField";
import InlineMessage from "../../../shared/ui/InlineMessage";
import CharacterPicker from "./CharacterPicker";
import {
  DIALOG_TITLES,
  FIELD_LABELS,
  FIELD_MAX_LENGTH,
  PASSWORD_FIELDS,
} from "../profileFields";

/*
  نافذة واحدة يتغيّر محتواها حسب editing.
  editor: ما يرجّعه useProfileEditor (القيم والدوال).
*/
export default function ProfileEditDialog({ editor }) {
  const { editing, busy, deleted, trigger, close } = editor;

  return (
    <Dialog.Root
      open={Boolean(editing)}
      onOpenChange={(isOpen) => {
        if (!isOpen) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="profile-dialog-overlay" />

        <Dialog.Content
          className="profile-dialog"
          dir="rtl"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (busy || deleted) {
              event.preventDefault();
            }
          }}
        >
          <button
            type="button"
            className="profile-dialog__close"
            aria-label="إغلاق"
            disabled={busy}
            onClick={close}
          >
            <X size={20} aria-hidden="true" />
          </button>

          {deleted ? <DeletedMessage onClose={close} /> : <EditForm editor={editor} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// نافذة نجاح حذف الحساب
function DeletedMessage({ onClose }) {
  return (
    <div className="profile-deleted">
      <span className="profile-deleted__icon">
        <Check aria-hidden="true" />
      </span>

      <Dialog.Title>تم حذف حسابك</Dialog.Title>

      <Dialog.Description>
        نشكرك على وقتك معنا. تقدر تفتح حساب جديد في أي وقت.
      </Dialog.Description>

      <Button fullWidth onClick={onClose}>
        رجوع للصفحة الرئيسية
      </Button>
    </div>
  );
}

function getDescription(editing) {
  if (editing === "avatar") return "اختر الشخصية اللي تمثلك في الجولات.";
  if (editing === "delete") return "بينحذف حسابك نهائيًا. ما نقدر نرجعه بعدين.";
  return "عدّل بياناتك ثم احفظ التغييرات.";
}

function EditForm({ editor }) {
  const { user, editing, draft, error, busy, change, setAvatar, save, close } =
    editor;
  const isDelete = editing === "delete";

  return (
    <>
      <Dialog.Title>{DIALOG_TITLES[editing]}</Dialog.Title>

      {/* الوصف ظاهر للشخصية والحذف، ومخفي بصريًا (لقارئ الشاشة) لبقية الحقول */}
      <Dialog.Description
        className={
          editing === "avatar" || isDelete
            ? "profile-dialog__description"
            : "profile-sr-only"
        }
      >
        {getDescription(editing)}
      </Dialog.Description>

      <form onSubmit={save}>
        <fieldset disabled={busy} className="profile-dialog__fields">
          {/* تغيير الشخصية */}
          {editing === "avatar" && (
            <CharacterPicker value={draft.avatar_id} onChange={setAvatar} />
          )}

          {/* الاسم واسم المستخدم ورقم الجوال */}
          {FIELD_LABELS[editing] && (
            <AuthField
              label={FIELD_LABELS[editing]}
              value={draft[editing] || ""}
              onChange={change(editing)}
              type={editing === "phone_number" ? "tel" : "text"}
              inputDir={editing === "username" ? "ltr" : undefined}
              maxLength={FIELD_MAX_LENGTH[editing]}
              required
              autoComplete="off"
            />
          )}

          {/* تغيير كلمة المرور */}
          {editing === "password" &&
            PASSWORD_FIELDS.map(([key, label]) => (
              <AuthField
                key={key}
                label={label}
                type="password"
                value={draft[key]}
                onChange={change(key)}
                required
                autoComplete={
                  key === "old_password" ? "current-password" : "new-password"
                }
              />
            ))}

          {/* تأكيد حذف الحساب */}
          {isDelete && (
            <AuthField
              label={`اكتب اسم المستخدم ${user.username} للتأكيد`}
              value={draft.confirmation || ""}
              onChange={change("confirmation")}
              inputDir="ltr"
              placeholder={user.username}
              autoComplete="off"
              required
            />
          )}
        </fieldset>

        {error && <InlineMessage type="error" message={error} />}

        <div className="profile-dialog__actions">
          <Button
            type="submit"
            loading={busy}
            className={isDelete ? "profile-delete-confirm" : ""}
            // زر الحذف لا يعمل حتى يطابق الاسم المكتوب اسم المستخدم
            disabled={isDelete && draft.confirmation !== user.username}
          >
            {isDelete ? "احذف حسابي نهائيًا" : "حفظ التغييرات"}
          </Button>

          <Button variant="outline" disabled={busy} onClick={close}>
            {isDelete ? "تراجع" : "إلغاء"}
          </Button>
        </div>
      </form>
    </>
  );
}
