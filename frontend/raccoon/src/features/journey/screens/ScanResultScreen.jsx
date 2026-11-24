import ScanLayout from "../components/ScanLayout/ScanLayout";
import HintCard from "../components/HintCard/HintCard";
import { ScanNote } from "../components/InfoCard/InfoCard";
import { BoardAndHomeActions, ContinueAction } from "../components/ScanActions";
import { CupBadge, NumberBadge } from "../components/ScanBadges/ScanBadges";
import { padTag } from "../utils/scanErrors";
import TrapScreen from "./TrapScreen";
import { useTranslation } from "react-i18next";

/*
  المسح نجح. الشاشة حسب النتيجة:
    view_only       الجولة انتهت، القطعة للعرض فقط
    tag_type=trap   شاشات الفخاخ (TrapScreen)
    event_finished  خلصتها! جمع كل القطع
    غير ذلك         حصلتها!
*/
export default function ScanResultScreen({
  shell,
  scanResult,
  onHome,
  onBoard,
  choose,
}) {
  const { t } = useTranslation();
  const content = scanResult.content;
  const score = scanResult.current_score ?? 0;
  const remaining = scanResult.remaining_tags ?? 0;
  const tagNumber = scanResult.tag_sequence;

  if (scanResult.status === "view_only") {
    return (
      <ScanLayout
        {...shell}
        statusChip={t("journey.roundEnded")}
        title={t("journey.roundEnded")}
        tone="mint"
        badge={<NumberBadge value={tagNumber} />}
        pill={t("journey.result.viewOnlyPill")}
        score={score}
        actions={<BoardAndHomeActions onBoard={onBoard} onHome={onHome} />}
      >
        <HintCard text={content?.hint} image={content?.image} />
        {scanResult.tag_type === "trap" && (
          <ScanNote>{t("journey.result.viewOnlyTrap")}</ScanNote>
        )}
      </ScanLayout>
    );
  }

  if (scanResult.tag_type === "trap") {
    return (
      <TrapScreen
        shell={shell}
        scanResult={scanResult}
        score={score}
        remaining={remaining}
        onHome={onHome}
        choose={choose}
      />
    );
  }

  if (scanResult.event_finished) {
    const total = score + remaining;

    return (
      <ScanLayout
        {...shell}
        statusChip={t("journey.roundEnded")}
        title={t("journey.error.completedTitle")}
        badge={<CupBadge count={`${score}/${total}`} />}
        pill={t("journey.error.completedPill")}
        score={score}
        remaining={remaining}
        actions={<BoardAndHomeActions onBoard={onBoard} onHome={onHome} />}
      >
        <ScanNote strong={t("journey.result.finishedStrong")}>
          {t("journey.result.finishedNote")}
        </ScanNote>
      </ScanLayout>
    );
  }

  return (
    <ScanLayout
      {...shell}
      score={score}
      remaining={remaining}
      title={t("auth.found.title")}
      badge={<NumberBadge value={tagNumber} />}
      pill={
        scanResult.mode === "open"
          ? t("journey.result.openPill", { number: padTag(tagNumber) })
          : t("journey.result.seqPill", { score, total: score + remaining })
      }
      actions={<ContinueAction onHome={onHome} />}
    >
      <HintCard text={content?.hint} image={content?.image} />
    </ScanLayout>
  );
}
