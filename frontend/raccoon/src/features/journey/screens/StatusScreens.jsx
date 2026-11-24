import ScanLayout from "../components/ScanLayout/ScanLayout";
import InfoCard from "../components/InfoCard/InfoCard";
import { HomeAction } from "../components/ScanActions";
import { LockBadge, MarkBadge } from "../components/ScanBadges/ScanBadges";
import { useTranslation } from "react-i18next";

// شاشات ما قبل النتيجة: التحميل، الرابط الناقص، ولا بيانات.
// shell: الخصائص المشتركة لـ ScanLayout (المتصدرون) من ScanPage.

export function LoadingScreen({ shell }) {
  const { t } = useTranslation();
  return (
    <ScanLayout
      {...shell}
      showStats={false}
      title={t("journey.status.loadingTitle")}
      badge={<MarkBadge />}
      pill={t("journey.status.loadingPill")}
    />
  );
}

export function InvalidLinkScreen({ shell, message, onHome }) {
  const { t } = useTranslation();
  return (
    <ScanLayout
      {...shell}
      showStats={false}
      title={t("journey.status.invalidTitle")}
      badge={<LockBadge />}
      pill={t("journey.status.invalidPill")}
      actions={<HomeAction onHome={onHome} />}
    >
      <InfoCard title={message} text={t("journey.status.invalidText")} />
    </ScanLayout>
  );
}

export function EmptyScreen({ shell, onHome }) {
  const { t } = useTranslation();
  return (
    <ScanLayout
      {...shell}
      showStats={false}
      title={t("journey.status.emptyTitle")}
      badge={<MarkBadge />}
      pill={t("journey.status.emptyPill")}
      actions={<HomeAction onHome={onHome} />}
    />
  );
}
