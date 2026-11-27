import ScanLayout from "../components/ScanLayout/ScanLayout";
import InfoCard, { ScanNote } from "../components/InfoCard/InfoCard";
import ChooseTrap from "../components/ChooseTrap";
import FreezeView from "../components/FreezeView";
import {
  BoomBadge,
  DiceBadge,
  NumberBadge,
  TRAP_ORBIT,
} from "../components/ScanBadges/ScanBadges";
import { useTranslation } from "react-i18next";

/*
  اللاعب مسح قطعة فخ. content يحدّد النوع:
    was_choose (بعد trap_set)  زرعته!     اللاعب زرع فخًا للتو
    choose                     اختر الفخ!  اللاعب يختار النوع والمدة
    boom                       بووم!      خسر نقطة
    freeze                     تجمّدت!    عدّاد
  stats: { score, remaining, total } لنقاط التقدّم
*/
export default function TrapScreen({ shell, scanResult, stats, choose }) {
  const { t } = useTranslation();
  const content = scanResult.content;

  if (scanResult.status === "trap_set" && content?.was_choose) {
    return (
      <ScanLayout
        {...shell}
        mode="open"
        {...stats}
        title={t("journey.trap.plantedTitle")}
        badge={<DiceBadge />}
        orbit={TRAP_ORBIT}
      >
        <InfoCard
          title={
            content.boom
              ? t("journey.trap.plantedBoomCard")
              : t("journey.trap.plantedFreezeCard")
          }
          text={t("journey.trap.plantedText")}
        />
      </ScanLayout>
    );
  }

  if (content?.choose) {
    return (
      <ChooseTrap
        key={choose.key}
        shell={shell}
        stats={stats}
        tagHash={choose.tagHash}
        userHash={choose.userHash}
        onActivated={choose.onActivated}
      />
    );
  }

  if (content?.boom) {
    return (
      <ScanLayout
        {...shell}
        mode="open"
        {...stats}
        title={t("journey.trap.boomTitle")}
        badge={<BoomBadge value={`−${content.boom}`} />}
      >
        <InfoCard
          variant="stat"
          label={t("journey.trap.boomLabel")}
          // النقاط ما تنزل تحت الصفر، فاللي قبل = اللي بعد + الخصم (تقريبًا لو وصل صفر)
          title={t("journey.trap.boomCardTitle", {
            before: stats.score + content.boom,
            score: stats.score,
          })}
          text={t("journey.trap.boomCardText")}
          aside={`−${content.boom}`}
        />
      </ScanLayout>
    );
  }

  if (content?.freeze) {
    return (
      <FreezeView
        shell={shell}
        stats={stats}
        frozenUntil={scanResult.frozen_until}
        freezeSeconds={content.freeze}
      />
    );
  }

  return (
    <ScanLayout
      {...shell}
      mode="open"
      {...stats}
      title={t("journey.trap.emptyTitle")}
      badge={<NumberBadge value={scanResult.tag_sequence} />}
    >
      <ScanNote>{t("journey.trap.emptyPill")}</ScanNote>
    </ScanLayout>
  );
}
