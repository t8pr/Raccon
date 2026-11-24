import ScanLayout from "../components/ScanLayout/ScanLayout";
import HintCard from "../components/HintCard/HintCard";
import InfoCard, { ScanNote } from "../components/InfoCard/InfoCard";
import FreezeView from "../components/FreezeView";
import { ContinueAction, HomeAction } from "../components/ScanActions";
import {
  CheckBadge,
  CupBadge,
  FlagBadge,
  LockBadge,
  MarkBadge,
  NumberBadge,
} from "../components/ScanBadges/ScanBadges";
import {
  getClaimerName,
  getExpectedTag,
  getErrorKind,
  padTag,
} from "../utils/scanErrors";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
          title={t("journey.error.alreadyTitle")}
          tone="mint"
          badge={<CheckBadge />}
          pill={t("journey.error.alreadyPill")}
          actions={
            <ContinueAction onHome={onHome} label={t("journey.keepPlaying")} />
          }
        >
          <HintCard
            text={scanError.content?.hint}
            image={scanError.content?.image}
          />
          <ScanNote>{t("journey.error.alreadyNote")}</ScanNote>
        </ScanLayout>
      );

    case "claimed_by_another_player": {
      const claimer = getClaimerName(scanError.message);

      return (
        <ScanLayout
          {...shell}
          {...stats}
          title={t("journey.error.claimedTitle")}
          badge={<FlagBadge />}
          pill={t("journey.error.claimedPill")}
          actions={<ContinueAction onHome={onHome} />}
        >
          <ScanNote
            strong={
              claimer ? (
                <>
                  <bdi>{claimer}</bdi> {t("journey.error.claimedBy")}
                </>
              ) : (
                t("journey.error.claimedByOther")
              )
            }
          >
            {t("journey.error.claimedNote")}
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
          title={t("journey.error.skippedTitle")}
          tone="mint"
          badge={<NumberBadge value={scanned ?? "؟"} />}
          pill={t("journey.error.skippedPill", { number: padTag(expected ?? "؟") })}
          actions={
            <ContinueAction onHome={onHome} label={t("journey.keepPlaying")} />
          }
        >
          <ScanNote>
            {t("journey.error.skippedNote", { number: padTag(expected ?? "؟") })}
          </ScanNote>
        </ScanLayout>
      );
    }

    case "not_live":
      return (
        <ScanLayout
          {...shell}
          showStats={false}
          title={t("journey.error.notLiveTitle")}
          badge={<MarkBadge />}
          pill={t("journey.error.notLivePill")}
          actions={<HomeAction onHome={onHome} />}
        >
          <InfoCard
            title={t("journey.error.notLiveCardTitle")}
            text={t("journey.error.notLiveCardText")}
          />
        </ScanLayout>
      );

    case "not_yours":
      return (
        <ScanLayout
          {...shell}
          showStats={false}
          title={t("journey.error.notYoursTitle")}
          badge={<LockBadge />}
          pill={t("journey.error.notYoursPill")}
          actions={<HomeAction onHome={onHome} />}
        >
          <InfoCard
            title={t("journey.error.notYoursCardTitle")}
            text={t("journey.error.notYoursCardText")}
          />
        </ScanLayout>
      );

    case "completed":
      return (
        <ScanLayout
          {...shell}
          showStats={false}
          title={t("journey.error.completedTitle")}
          badge={<CupBadge />}
          pill={t("journey.error.completedPill")}
          actions={<HomeAction onHome={onHome} />}
        >
          <ScanNote strong={t("journey.error.completedStrong")}>
            {t("journey.error.completedNote")}
          </ScanNote>
        </ScanLayout>
      );

    default:
      return (
        <ScanLayout
          {...shell}
          showStats={false}
          title={t("journey.error.unknownTitle")}
          badge={<LockBadge />}
          pill={t("journey.error.unknownPill")}
          actions={<HomeAction onHome={onHome} />}
        >
          <InfoCard
            title={scanError.message || t("journey.error.readFailed")}
            text={t("journey.error.unknownText")}
          />
        </ScanLayout>
      );
  }
}
