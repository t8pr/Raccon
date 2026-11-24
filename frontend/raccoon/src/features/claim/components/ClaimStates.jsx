import Button from "../../../shared/ui/Button/Button";
import InlineMessage from "../../../shared/ui/InlineMessage/InlineMessage";
import { useTranslation } from "react-i18next";

// محتوى البطاقة قبل وصول بيانات الباكج: رابط خاطئ، تحميل، أو فشل.

export function InvalidLinkState() {
  const { t } = useTranslation();
  return (
    <>
      <h1 id="claim-title">{t("claim.invalidLinkTitle")}</h1>
      <InlineMessage
        type="error"
        message={t("claim.invalidLinkText")}
      />
    </>
  );
}

export function CheckingState() {
  const { t } = useTranslation();
  return (
    <>
      <h1 id="claim-title">{t("claim.title")}</h1>
      <InlineMessage message={t("claim.checking")} />
    </>
  );
}

export function RestoreErrorState({ message }) {
  const { t } = useTranslation();
  return (
    <>
      <h1 id="claim-title">{t("claim.restoreErrorTitle")}</h1>
      <InlineMessage type="error" message={message} />
      <Button onClick={() => window.location.reload()}>
        {t("common.retry")}
      </Button>
    </>
  );
}

export function PreviewErrorState({ notFound, retrying, onRetry }) {
  const { t } = useTranslation();
  return (
    <>
      <h1 id="claim-title">{t("claim.previewErrorTitle")}</h1>

      <InlineMessage
        type="error"
        message={
          notFound
            ? t("claim.notFound")
            : t("common.serverError")
        }
      />

      <Button variant="outline" loading={retrying} onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </>
  );
}

export function MissingPackState() {
  const { t } = useTranslation();
  return <InlineMessage type="error" message={t("claim.missingPack")} />;
}
