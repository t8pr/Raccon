import { Check, Pencil, X } from "lucide-react";

import Button from "../../../shared/ui/Button/Button";
import { EVENT_NAME_MAX_LENGTH } from "../hooks/useEventRename";
import { useTranslation } from "react-i18next";

/*
  عنوان صفحة التخصيص: اسم الجولة وزر القلم،
  وعند التعديل يحل الحقل مكان العنوان في نفس السطر.
  rename: ما يرجّعه useEventRename.
*/
export default function EventNameEditor({ title, rename }) {
  const { t } = useTranslation();
  return (
    <header className="customization-heading">
      {rename.editing ? (
        <form
          className="event-name-row"
          onSubmit={rename.save}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              rename.cancel();
            }
          }}
        >
          <input
            className="event-name-input"
            aria-label={t("customization.rename.inputLabel")}
            value={rename.draft}
            onChange={(event) => rename.setDraft(event.target.value)}
            maxLength={EVENT_NAME_MAX_LENGTH}
            disabled={rename.saving}
            autoFocus
            dir="auto"
            aria-invalid={Boolean(rename.error)}
            aria-describedby={rename.error ? "event-name-error" : undefined}
          />

          <Button
            type="submit"
            variant="outline"
            className="event-name-action"
            loading={rename.saving}
            aria-label={t("customization.rename.save")}
            title={t("customization.rename.save")}
          >
            <Check size={20} aria-hidden="true" />
          </Button>

          <Button
            variant="outline"
            className="event-name-action"
            disabled={rename.saving}
            aria-label={t("customization.rename.cancel")}
            title={t("customization.rename.cancel")}
            onClick={rename.cancel}
          >
            <X size={20} aria-hidden="true" />
          </Button>
        </form>
      ) : (
        <div className="event-name-row">
          <h1>
            <bdi>{title?.trim() || t("packages.untitled")}</bdi>
          </h1>

          {/* زر عادي بنفس كلاسات Button: الأيقونة مباشرة بدون <span> الداخلي حق Button.
              ref لإرجاع التركيز بعد الحفظ أو الإلغاء. */}
          <button
            ref={rename.editButtonRef}
            type="button"
            className="ui-button ui-button--outline event-name-action event-name-edit"
            aria-label={t("customization.rename.edit")}
            title={t("customization.rename.edit")}
            onClick={() => rename.start(title)}
          >
            <Pencil size={20} aria-hidden="true" />
          </button>
        </div>
      )}

      {rename.error && (
        <p id="event-name-error" role="alert">
          {rename.error}
        </p>
      )}
    </header>
  );
}
