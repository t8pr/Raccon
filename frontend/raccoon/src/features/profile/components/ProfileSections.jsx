import { Pencil, LockKeyhole, Trash2 } from "lucide-react";
import Button from "../../../shared/ui/Button";
import {
  FIELD_LABELS,
  INFORMATION_ROWS,
  getDisplayValue,
  getRowLabel,
} from "../profileFields";

// أقسام صفحة الحساب الثلاثة. كلها عرض فقط؛ onEdit(field, event) يفتح نافذة التعديل.

// القسم الأول: الشخصية
export function IdentityCard({ user, avatarSrc, onEdit }) {
  return (
    <section className="profile-card profile-identity" aria-label="الشخصية">
      <div className="profile-identity__person">
        <div className="profile-avatar">
          <img src={avatarSrc} alt="شخصيتك" />

          <button
            type="button"
            className="profile-avatar__edit"
            aria-label="تعديل الشخصية"
            onClick={(event) => onEdit("avatar", event)}
          >
            <Pencil size={15} aria-hidden="true" />
          </button>
        </div>

        <div>
          <h2>{user.name}</h2>
          <bdi dir="ltr">@{user.username}</bdi>
        </div>
      </div>

      <Button variant="outline" onClick={(event) => onEdit("avatar", event)}>
        غيّر الشخصية
      </Button>
    </section>
  );
}

// القسم الثاني: المعلومات (الإيميل مقفل)
export function InformationCard({ user, onEdit }) {
  return (
    <section
      className="profile-card profile-info"
      aria-labelledby="profile-info-title"
    >
      <h2 id="profile-info-title">معلوماتي</h2>

      {INFORMATION_ROWS.map((field) => (
        <div className="profile-info__row" key={field}>
          <span className="profile-info__label">{getRowLabel(field)}</span>

          <strong>
            <bdi dir={field === "name" ? "rtl" : "ltr"}>
              {getDisplayValue(field, user)}
            </bdi>
          </strong>

          {field === "email" ? (
            <span className="profile-info__locked">
              <LockKeyhole size={13} aria-hidden="true" />
              ما يتعدّل
            </span>
          ) : (
            <Button
              variant="outline"
              aria-label={`${
                field === "password" ? "تغيير" : "تعديل"
              } ${FIELD_LABELS[field] || "كلمة المرور"}`}
              onClick={(event) => onEdit(field, event)}
            >
              <Pencil size={13} aria-hidden="true" />
              {field === "password" ? "تغيير" : "تعديل"}
            </Button>
          )}
        </div>
      ))}
    </section>
  );
}

// القسم الثالث: حذف الحساب
export function DangerCard({ onEdit }) {
  return (
    <section
      className="profile-card profile-danger"
      aria-labelledby="profile-delete-title"
    >
      <div>
        <h2 id="profile-delete-title">حذف الحساب</h2>
        <p>حذف حسابك نهائي. هذا الإجراء ما يمكن التراجع عنه.</p>
      </div>

      <Button variant="outline" onClick={(event) => onEdit("delete", event)}>
        <Trash2 size={16} aria-hidden="true" />
        احذف حسابي
      </Button>
    </section>
  );
}
