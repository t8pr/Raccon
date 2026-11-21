import ScanLayout from "../components/ScanLayout";
import InfoCard from "../components/InfoCard";
import ChooseTrap from "../components/ChooseTrap";
import FreezeView from "../components/FreezeView";
import { ContinueAction } from "../components/ScanActions";
import { BombBadge, FreezeBadge, NumberBadge } from "../components/ScanBadges";
import { padTag } from "../utils/scanErrors";

/*
  اللاعب مسح قطعة فخ. content يحدّد النوع:
    was_choose (بعد trap_set)  زرعته!     اللاعب زرع فخًا للتو
    choose                     اختر الفخ!  اللاعب يختار النوع والمدة
    boom                       بووم!      خسر نقطة
    freeze                     تجمّدت!    عدّاد
*/
export default function TrapScreen({
  shell,
  scanResult,
  score,
  remaining,
  onHome,
  choose,
}) {
  const content = scanResult.content;
  const tagNumber = scanResult.tag_sequence;
  const stats = { score, remaining };

  if (scanResult.status === "trap_set" && content?.was_choose) {
    const isBoom = Boolean(content.boom);

    return (
      <ScanLayout
        {...shell}
        {...stats}
        title="زرعته!"
        badge={isBoom ? <BombBadge /> : <FreezeBadge />}
        pill={
          isBoom
            ? `فخ بووم على القطعة ${padTag(tagNumber)}`
            : `فخ تجميد ${content.freeze} ث على القطعة ${padTag(tagNumber)}`
        }
        actions={<ContinueAction onHome={onHome} />}
      >
        <InfoCard
          title={
            isBoom
              ? "أول واحد يمسحها بعدك يخسر نقطة"
              : "أول واحد يمسحها بعدك يتجمّد"
          }
          text="كمّل، وخلّه يتفاجأ."
        />
      </ScanLayout>
    );
  }

  if (content?.choose) {
    return (
      <ChooseTrap
        key={choose.key}
        shell={shell}
        tagHash={choose.tagHash}
        userHash={choose.userHash}
        currentScore={score}
        remainingTags={remaining}
        onActivated={choose.onActivated}
      />
    );
  }

  if (content?.boom) {
    return (
      <ScanLayout
        {...shell}
        {...stats}
        title="بووم!"
        badge={<BombBadge value={`−${content.boom}`} />}
        pill={`خسرت نقطة · صارت نقاطك ${score}`}
        actions={<ContinueAction onHome={onHome} />}
      >
        <InfoCard
          label="تفاصيل الخصم"
          title={`نقاطك الآن ${score}`}
          text="النقاط ما تنزل تحت الصفر"
          aside={`−${content.boom}`}
        />
      </ScanLayout>
    );
  }

  if (content?.freeze) {
    return (
      <FreezeView
        shell={shell}
        currentScore={score}
        remainingTags={remaining}
        frozenUntil={scanResult.frozen_until}
        freezeSeconds={content.freeze}
        onContinue={onHome}
      />
    );
  }

  return (
    <ScanLayout
      {...shell}
      {...stats}
      title="قطعة فخ"
      badge={<NumberBadge value={tagNumber} />}
      pill="الفخ فاضي"
      actions={<ContinueAction onHome={onHome} />}
    />
  );
}
