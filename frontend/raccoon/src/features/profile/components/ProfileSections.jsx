import { Pencil, LockKeyhole, Trash2 } from "lucide-react";
import Button from "../../../shared/ui/Button/Button";
import {
  FIELD_LABELS,
  INFORMATION_ROWS,
  getDisplayValue,
  getRowLabel,
} from "../profileFields";
import { useTranslation } from "react-i18next";

// أقسام صفحة الحساب الثلاثة. كلها عرض فقط؛ onEdit(field, event) يفتح نافذة التعديل.

// القسم الأول: الشخصية
export function IdentityCard({ user, avatarSrc, onEdit }) {
  const { t } = useTranslation();
  return (
    <section className="profile-card profile-identity" aria-label={t("profile.character")}>
      <div className="profile-identity__person">
        <div className="profile-avatar">
          <img src={avatarSrc} alt={t("profile.yourCharacter")} />

          <button
            type="button"
            className="profile-avatar__edit"
            aria-label={t("profile.editCharacter")}
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
        {t("profile.changeCharacter")}
      </Button>
    </section>
  );
}

// القسم الثاني: المعلومات (الإيميل مقفل)
export function InformationCard({ user, onEdit }) {
  const { t } = useTranslation();
  return (
    <section
      className="profile-card profile-info"
      aria-labelledby="profile-info-title"
    >
      <h2 id="profile-info-title">{t("profile.myInfo")}</h2>

      {INFORMATION_ROWS.map((field) => (
        <div className="profile-info__row" key={field}>
          <span className="profile-info__label">{getRowLabel(field)}</span>

          <strong>
            <bdi dir={field === "name" ? "auto" : "ltr"}>
              {getDisplayValue(field, user)}
            </bdi>
          </strong>

          {field === "email" ? (
            <span className="profile-info__locked">
              <LockKeyhole size={13} aria-hidden="true" />
              {t("profile.locked")}
            </span>
          ) : (
            <Button
              variant="outline"
              aria-label={`${
                field === "password" ? t("common.change") : t("common.edit")
              } ${FIELD_LABELS[field] || t("auth.fields.password")}`}
              onClick={(event) => onEdit(field, event)}
            >
              <Pencil size={13} aria-hidden="true" />
              {field === "password" ? t("common.change") : t("common.edit")}
            </Button>
          )}
        </div>
      ))}
    </section>
  );
}

// القسم الثالث: حذف الحساب
export function DangerCard({ onEdit }) {
  const { t } = useTranslation();
  return (
    <section
      className="profile-card profile-danger"
      aria-labelledby="profile-delete-title"
    >
      <div>
        <h2 id="profile-delete-title">{t("profile.dialog.delete")}</h2>
        <p>{t("profile.dangerText")}</p>
      </div>

      <Button variant="outline" onClick={(event) => onEdit("delete", event)}>
        <Trash2 size={16} aria-hidden="true" />
        {t("profile.deleteMyAccount")}
      </Button>
    </section>
  );
}
