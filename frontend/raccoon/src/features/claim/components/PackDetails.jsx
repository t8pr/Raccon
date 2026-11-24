import { getModeLabel } from "../../../shared/constants/modes";
import {
  ClaimButton,
  GuestActions,
  OwnedByAnotherActions,
  OwnedByMeActions,
} from "./ClaimActions";
import { useTranslation } from "react-i18next";

// العنوان والوصف حسب حالة الباكج والمستخدم
function getHeading(claim, t) {
  const { signedIn, pack, ownedByMe, ownedByAnother, user, claimMutation } =
    claim;

  if (ownedByAnother) {
    return {
      title: t("claim.heading.otherTitle"),
      description: t("claim.heading.otherText"),
    };
  }

  if (ownedByMe) {
    return {
      title: claimMutation.isSuccess
        ? t("claim.heading.claimedTitle")
        : t("claim.heading.mineTitle"),
      description: t("claim.heading.mineText"),
    };
  }

  if (signedIn && pack?.owner_id === null) {
    return {
      title: t("claim.heading.readyTitle"),
      description: t("claim.heading.readyText", { name: user.name }),
    };
  }

  return {
    title: t("claim.title"),
    description: t("claim.heading.guestText"),
  };
}

// بيانات الباكج والأزرار المناسبة لحالته
export default function PackDetails({ claim }) {
  const { t } = useTranslation();
  const { pack, signedIn, ownedByMe, ownedByAnother } = claim;
  const { title, description } = getHeading(claim, t);

  let actions;
  if (!signedIn) actions = <GuestActions claim={claim} />;
  else if (ownedByAnother) actions = <OwnedByAnotherActions claim={claim} />;
  else if (ownedByMe) actions = <OwnedByMeActions claim={claim} />;
  else actions = <ClaimButton claim={claim} />;

  return (
    <>
      <h1 id="claim-title" aria-live="polite">
        {title}
      </h1>

      <p className="claim-card__intro">{description}</p>

      <dl className="claim-card__info">
        <div>
          <dt>{t("claim.info.id")}</dt>
          <dd>
            <bdi>{pack.id}</bdi>
          </dd>
        </div>

        <div className="claim-card__info-centered">
          <dt>{t("claim.info.mode")}</dt>
          <dd>{getModeLabel(pack.mode)}</dd>
        </div>

        <div className="claim-card__info-centered">
          <dt>{t("claim.info.nfcPieces")}</dt>
          <dd>{pack.tags_count}</dd>
        </div>
      </dl>

      {actions}

      <p className="claim-card__note">{t("claim.note")}</p>
    </>
  );
}
