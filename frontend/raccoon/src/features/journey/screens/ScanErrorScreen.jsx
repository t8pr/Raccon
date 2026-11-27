import ScanLayout from "../components/ScanLayout/ScanLayout";
import HintCard from "../components/HintCard/HintCard";
import InfoCard, { ScanNote } from "../components/InfoCard/InfoCard";
import FreezeView from "../components/FreezeView";
import {
  CheckBadge,
  FlagBadge,
  LockBadge,
  MarkBadge,
  NumberBadge,
  QuestionBadge,
  TrophyBadge,
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
    not_live                   استعد! الجولة ما بدأت
    not_yours                  رابط لاعب آخر
    completed                  خلّص الجولة من قبل
    unknown                    ما عرفناها (أي خطأ آخر)
*/
export default function ScanErrorScreen({ shell, scanError }) {
  const { t } = useTranslation();
  // أخطاء اللعب ترجع النقاط والباقي، فنعرض نقاط التقدّم إن وُجدت
  const stats = {
    score: scanError.current_score,
    remaining: scanError.remaining_tags,
    total: scanError.total_tags,
    showStats: scanError.current_score != null,
  };

  switch (getErrorKind(scanError)) {
    case "already_scanned":
      return (
        <ScanLayout
          {...shell}
          {...stats}
          title={t("journey.error.alreadyTitle")}
          titleSize={48.41}
          badge={<CheckBadge />}
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
          titleSize={52.51}
          badge={<FlagBadge />}
        >
          <InfoCard
            title={
              claimer ? (
                <>
                  <bdi>{claimer}</bdi> {t("journey.error.claimedBy")}
                </>
              ) : (
                t("journey.error.claimedByOther")
              )
            }
            label={t("journey.error.claimedTitle")}
            text={t("journey.error.claimedNote")}
          />
        </ScanLayout>
      );
    }

    case "freeze":
      return (
        <FreezeView
          shell={shell}
          stats={stats}
          frozenUntil={scanError.frozen_until}
        />
      );

    case "skipped_tag": {
      // الخادم يقول وش القطعة اللي لازم تنمسح أول: نعرضها في الدائرة
      const expected = padTag(getExpectedTag(scanError.message) ?? "؟");

      return (
        <ScanLayout
          {...shell}
          {...stats}
          title={t("journey.error.skippedTitle")}
          titleSize={52.51}
          badge={<NumberBadge value={expected} />}
        >
          <InfoCard
            title={t("journey.error.skippedPill", { number: expected })}
            text={t("journey.error.skippedText")}
          />
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
          titleSize={65.64}
          badge={<LockBadge />}
        >
          <InfoCard
            title={t("journey.error.notYoursCardTitle")}
            text={t("journey.error.notYoursCardText")}
          />
        </ScanLayout>
      );

    case "completed": {
      // الخادم يرسل محتوى القطعة لو فيها تلميح؛ نعرضه، وإلا بطاقة "خلصت"
      const hasHint = Boolean(
        scanError.content?.hint || scanError.content?.image,
      );

      return (
        <ScanLayout
          {...shell}
          showStats={false}
          title={t("journey.error.completedTitle")}
          titleSize={54.97}
          // العدد (12/12) يبان لو الخادم أرسل المجموع
          badge={
            <TrophyBadge
              count={
                scanError.total_tags
                  ? `${scanError.total_tags}/${scanError.total_tags}`
                  : null
              }
            />
          }
        >
          {hasHint ? (
            <HintCard
              text={scanError.content.hint}
              image={scanError.content.image}
            />
          ) : (
            <InfoCard
              title={t("journey.error.completedStrong")}
              text={t("journey.error.completedNote")}
            />
          )}
        </ScanLayout>
      );
    }

    default:
      return (
        <ScanLayout
          {...shell}
          showStats={false}
          title={t("journey.error.unknownTitle")}
          titleSize={63.18}
          badge={<QuestionBadge />}
        >
          <InfoCard
            title={t("journey.error.unknownCardTitle")}
            text={t("journey.error.unknownCardText")}
          />
        </ScanLayout>
      );
  }
}
