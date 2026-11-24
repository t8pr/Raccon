import ScanLayout from "../components/ScanLayout/ScanLayout";
import InfoCard from "../components/InfoCard/InfoCard";
import ChooseTrap from "../components/ChooseTrap";
import FreezeView from "../components/FreezeView";
import { ContinueAction } from "../components/ScanActions";
import { BombBadge, FreezeBadge, NumberBadge } from "../components/ScanBadges/ScanBadges";
import { padTag } from "../utils/scanErrors";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const content = scanResult.content;
  const tagNumber = scanResult.tag_sequence;
  const stats = { score, remaining };

  if (scanResult.status === "trap_set" && content?.was_choose) {
    const isBoom = Boolean(content.boom);

    return (
      <ScanLayout
        {...shell}
        {...stats}
        title={t("journey.trap.plantedTitle")}
        badge={isBoom ? <BombBadge /> : <FreezeBadge />}
        pill={
          isBoom
            ? t("journey.trap.plantedBoomPill", { number: padTag(tagNumber) })
            : t("journey.trap.plantedFreezePill", {
                seconds: content.freeze,
                number: padTag(tagNumber),
              })
        }
        actions={<ContinueAction onHome={onHome} />}
      >
        <InfoCard
          title={
            isBoom
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
        title={t("journey.trap.boomTitle")}
        badge={<BombBadge value={`−${content.boom}`} />}
        pill={t("journey.trap.boomPill", { score })}
        actions={<ContinueAction onHome={onHome} />}
      >
        <InfoCard
          label={t("journey.trap.boomLabel")}
          title={t("journey.trap.boomCardTitle", { score })}
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
      title={t("journey.trap.emptyTitle")}
      badge={<NumberBadge value={tagNumber} />}
      pill={t("journey.trap.emptyPill")}
      actions={<ContinueAction onHome={onHome} />}
    />
  );
}
