import ScanLayout from "../components/ScanLayout";
import HintCard from "../components/HintCard";
import { ScanNote } from "../components/InfoCard";
import { BoardAndHomeActions, ContinueAction } from "../components/ScanActions";
import { CupBadge, NumberBadge } from "../components/ScanBadges";
import { padTag } from "../utils/scanErrors";
import TrapScreen from "./TrapScreen";

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
  const content = scanResult.content;
  const score = scanResult.current_score ?? 0;
  const remaining = scanResult.remaining_tags ?? 0;
  const tagNumber = scanResult.tag_sequence;

  if (scanResult.status === "view_only") {
    return (
      <ScanLayout
        {...shell}
        statusChip="انتهت الجولة"
        title="انتهت الجولة"
        tone="mint"
        badge={<NumberBadge value={tagNumber} />}
        pill="للعرض فقط · ما تنحسب نقاط"
        score={score}
        actions={<BoardAndHomeActions onBoard={onBoard} onHome={onHome} />}
      >
        <HintCard text={content?.hint} image={content?.image} />
        {scanResult.tag_type === "trap" && (
          <ScanNote>هذه قطعة فخ. ما راح ينطبق أي تأثير.</ScanNote>
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
        statusChip="انتهت الجولة"
        title="خلصتها!"
        badge={<CupBadge count={`${score}/${total}`} />}
        pill="ما تقدر تمسح قطع جديدة"
        score={score}
        remaining={remaining}
        actions={<BoardAndHomeActions onBoard={onBoard} onHome={onHome} />}
      >
        <ScanNote strong="ألف مبروووك! لقيت كل القطع">
          الآن خلصت الجولة، شوف ترتيبك في المتصدرين.
        </ScanNote>
      </ScanLayout>
    );
  }

  return (
    <ScanLayout
      {...shell}
      score={score}
      remaining={remaining}
      title="حصلتها!"
      badge={<NumberBadge value={tagNumber} />}
      pill={
        scanResult.mode === "open"
          ? `القطعة ${padTag(tagNumber)} صارت لك`
          : `القطعة ${score} من ${score + remaining}`
      }
      actions={<ContinueAction onHome={onHome} />}
    >
      <HintCard text={content?.hint} image={content?.image} />
    </ScanLayout>
  );
}
