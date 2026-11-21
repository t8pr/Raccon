import ScanLayout from "../components/ScanLayout";
import HintCard from "../components/HintCard";
import InfoCard, { ScanNote } from "../components/InfoCard";
import FreezeView from "../components/FreezeView";
import { ContinueAction, HomeAction } from "../components/ScanActions";
import {
  CheckBadge,
  CupBadge,
  FlagBadge,
  LockBadge,
  MarkBadge,
  NumberBadge,
} from "../components/ScanBadges";
import {
  getClaimerName,
  getExpectedTag,
  getErrorKind,
  padTag,
} from "../utils/scanErrors";

/*
  الخادم رفض المسح. شاشة لكل سبب:
    already_scanned            حقتك من قبل (يعيد عرض التلميح)
    claimed_by_another_player  سبقك غيرك (صيد مفتوح)
    freeze                     اللاعب متجمّد حاليًا
    skipped_tag                مو بالترتيب (تسلسلي)
    not_live                   الجولة ما بدأت
    not_yours                  رابط لاعب آخر
    completed                  خلّص الجولة من قبل
    unknown                    أي خطأ آخر
*/
export default function ScanErrorScreen({ shell, scanError, onHome }) {
  // أخطاء اللعب ترجع النقاط والباقي، فنعرضهما إن وُجدا
  const stats = {
    score: scanError.current_score,
    remaining: scanError.remaining_tags,
    showStats: scanError.current_score != null,
  };

  switch (getErrorKind(scanError)) {
    case "already_scanned":
      return (
        <ScanLayout
          {...shell}
          {...stats}
          title="حقتك من قبل"
          tone="mint"
          badge={<CheckBadge />}
          pill="ما تنضاف نقطة ثانية"
          actions={<ContinueAction onHome={onHome} label="كمّل اللعب" />}
        >
          <HintCard
            text={scanError.content?.hint}
            image={scanError.content?.image}
          />
          <ScanNote>هذا تلميح القطعة مرة ثانية — نقاطك ما تغيّرت.</ScanNote>
        </ScanLayout>
      );

    case "claimed_by_another_player": {
      const claimer = getClaimerName(scanError.message);

      return (
        <ScanLayout
          {...shell}
          {...stats}
          title="سبقك غيرك!"
          badge={<FlagBadge />}
          pill="دوّر على قطعة ثانية بسرعة"
          actions={<ContinueAction onHome={onHome} />}
        >
          <ScanNote
            strong={
              claimer ? (
                <>
                  <bdi>{claimer}</bdi> سبقك لهذي القطعة
                </>
              ) : (
                "لاعب ثاني سبقك لهذي القطعة"
              )
            }
          >
            ما تغيّرت نقاطك. القطع الثانية لسّا تنتظرك!
          </ScanNote>
        </ScanLayout>
      );
    }

    case "freeze":
      return (
        <FreezeView
          shell={shell}
          currentScore={scanError.current_score}
          remainingTags={scanError.remaining_tags}
          frozenUntil={scanError.frozen_until}
          onContinue={onHome}
        />
      );

    case "skipped_tag": {
      const expected = getExpectedTag(scanError.message);
      // الخادم لا يرجّع رقم القطعة الممسوحة دائمًا؛ نقدّره بالتي بعد المطلوبة
      const scanned =
        scanError.tag_sequence ?? (expected ? Number(expected) + 1 : null);

      return (
        <ScanLayout
          {...shell}
          {...stats}
          title="مو بالترتيب!"
          tone="mint"
          badge={<NumberBadge value={scanned ?? "؟"} />}
          pill={`امسح القطعة ${padTag(expected ?? "؟")} أول`}
          actions={<ContinueAction onHome={onHome} label="كمّل اللعب" />}
        >
          <ScanNote>
            لازم تمسح القطعة {padTag(expected ?? "؟")} قبل هذي. في الوضع التسلسلي
            القطع تنفتح بالترتيب، ونقاطك ما تغيّرت.
          </ScanNote>
        </ScanLayout>
      );
    }

    case "not_live":
      return (
        <ScanLayout
          {...shell}
          showStats={false}
          title="استعد!"
          badge={<MarkBadge />}
          pill="الجولة ما بدأت أو انتهت"
          actions={<HomeAction onHome={onHome} />}
        >
          <InfoCard
            title="ننتظر المنظّم يبدأ الجولة"
            text="صاحب اللعبة ما شغّلها أو وقّفها مؤقتًا. امسح القطعة مرة ثانية لما تشتغل."
          />
        </ScanLayout>
      );

    case "not_yours":
      return (
        <ScanLayout
          {...shell}
          showStats={false}
          title="مو رابطك!"
          badge={<LockBadge />}
          pill="هذا الرابط مو لك"
          actions={<HomeAction onHome={onHome} />}
        >
          <InfoCard
            title="امسح القطعة بجوالك عشان تفتحها"
            text="الروابط ما تنتقل بين اللاعبين، كل مسح ينحسب لصاحبه."
          />
        </ScanLayout>
      );

    case "completed":
      return (
        <ScanLayout
          {...shell}
          showStats={false}
          title="خلصتها!"
          badge={<CupBadge />}
          pill="ما تقدر تمسح قطع جديدة"
          actions={<HomeAction onHome={onHome} />}
        >
          <ScanNote strong="أنت خلصت هذي الجولة من قبل">
            ما فيه قطع جديدة تمسحها في هذي الجولة.
          </ScanNote>
        </ScanLayout>
      );

    default:
      return (
        <ScanLayout
          {...shell}
          showStats={false}
          title="ما ضبطت!"
          badge={<LockBadge />}
          pill="تعذّر قراءة القطعة"
          actions={<HomeAction onHome={onHome} />}
        >
          <InfoCard
            title={scanError.message || "تعذر قراءة البطاقة."}
            text="جرّب تمسح القطعة مرة ثانية."
          />
        </ScanLayout>
      );
  }
}
