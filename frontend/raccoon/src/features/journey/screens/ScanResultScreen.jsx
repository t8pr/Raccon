import ScanLayout from "../components/ScanLayout/ScanLayout";
import HintCard from "../components/HintCard/HintCard";
import InfoCard, { ScanNote } from "../components/InfoCard/InfoCard";
import { NumberBadge, TrophyBadge } from "../components/ScanBadges/ScanBadges";
import TrapScreen from "./TrapScreen";
import { useTranslation } from "react-i18next";

/*
  المسح نجح. الشاشة حسب النتيجة:
    view_only       الجولة انتهت، القطعة للعرض فقط
    tag_type=trap   شاشات الفخاخ (TrapScreen)
    event_finished  آخر قطعة: خلصت! بكأس وتهنئة
    غير ذلك         حصلتها! برقم القطعة وتلميحها
*/
export default function ScanResultScreen({ shell, scanResult, choose }) {
  const { t } = useTranslation();
  const content = scanResult.content;
  const stats = {
    score: scanResult.current_score ?? 0,
    remaining: scanResult.remaining_tags ?? 0,
    total: scanResult.total_tags,
  };
  const tagNumber = scanResult.tag_sequence;

  if (scanResult.status === "view_only") {
    return (
      <ScanLayout
        {...shell}
        {...stats}
        title={t("journey.roundEnded")}
        badge={<NumberBadge value={tagNumber} />}
      >
        <HintCard text={content?.hint} image={content?.image} />
        <ScanNote>
          {scanResult.tag_type === "trap"
            ? t("journey.result.viewOnlyTrap")
            : t("journey.result.viewOnlyPill")}
        </ScanNote>
      </ScanLayout>
    );
  }

  if (scanResult.tag_type === "trap") {
    return (
      <TrapScreen
        shell={shell}
        scanResult={scanResult}
        stats={stats}
        choose={choose}
      />
    );
  }

  if (scanResult.event_finished || scanResult.code === "completed") {
    // التسلسلي: لقى كل القطع (9/9). المفتوح: القطع موزّعة بين اللاعبين، فبدون عدد
    const isSeq = scanResult.mode === "seq";
    const total = scanResult.total_tags;

    return (
      // الشريط مليان والمتصدرين ظاهرين: أهم شي بعد ما تخلص ترتيبك
      <ScanLayout
        {...shell}
        {...stats}
        title={t("journey.error.completedTitle")}
        titleSize={54.97}
        badge={
          <TrophyBadge count={isSeq && total ? `${total}/${total}` : null} />
        }
      >
        <InfoCard
          title={t(
            isSeq
              ? "journey.result.finishedStrong"
              : "journey.result.finishedOpenStrong",
          )}
          text={t("journey.result.finishedNote")}
        />
      </ScanLayout>
    );
  }

  return (
    <ScanLayout
      {...shell}
      {...stats}
      title={t("auth.found.title")}
      badge={<NumberBadge value={tagNumber} />}
    >
      <HintCard text={content?.hint} image={content?.image} />
    </ScanLayout>
  );
}
