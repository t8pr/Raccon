import ScanLayout from "../components/ScanLayout/ScanLayout";
import InfoCard from "../components/InfoCard/InfoCard";
import { LockBadge, MarkBadge } from "../components/ScanBadges/ScanBadges";
import { useTranslation } from "react-i18next";

// شاشات ما قبل النتيجة: التحميل، الرابط الناقص، ولا بيانات.
// shell: الخصائص المشتركة لـ ScanLayout من ScanPage.

export function LoadingScreen({ shell }) {
  const { t } = useTranslation();
  return (
    <ScanLayout
      {...shell}
      showStats={false}
      title={t("journey.status.loadingTitle")}
      badge={<MarkBadge />}
    />
  );
}

export function InvalidLinkScreen({ shell, message }) {
  const { t } = useTranslation();
  return (
    <ScanLayout
      {...shell}
      showStats={false}
      title={t("journey.status.invalidTitle")}
      badge={<LockBadge />}
    >
      <InfoCard title={message} text={t("journey.status.invalidText")} />
    </ScanLayout>
  );
}

export function EmptyScreen({ shell }) {
  const { t } = useTranslation();
  return (
    <ScanLayout
      {...shell}
      showStats={false}
      title={t("journey.status.emptyTitle")}
      badge={<MarkBadge />}
    >
      <InfoCard
        title={t("journey.status.emptyPill")}
        text={t("journey.status.invalidText")}
      />
    </ScanLayout>
  );
}
