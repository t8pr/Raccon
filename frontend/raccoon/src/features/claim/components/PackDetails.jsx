import { getModeLabel } from "../../../shared/constants/modes";
import {
  ClaimButton,
  GuestActions,
  OwnedByAnotherActions,
  OwnedByMeActions,
} from "./ClaimActions";

// العنوان والوصف حسب حالة الباكج والمستخدم
function getHeading(claim) {
  const { signedIn, pack, ownedByMe, ownedByAnother, user, claimMutation } =
    claim;

  if (ownedByAnother) {
    return {
      title: "تم ربط الحزمة بمستخدم آخر",
      description:
        "كل باكج يرتبط بحساب واحد. إذا استلمته بحسابك الآخر، سجّل الدخول بذلك الحساب.",
    };
  }

  if (ownedByMe) {
    return {
      title: claimMutation.isSuccess
        ? "ألف مبروك، تم ربط الحزمة بك!"
        : "هذه الحزمة مرتبطة بحسابك",
      description: "تقدر تجهّزها الحين أو ترجع لها لاحقًا من صفحة باقاتي.",
    };
  }

  if (signedIn && pack?.owner_id === null) {
    return {
      title: "حزمتك جاهزة، باقي نربطها باسمك",
      description: `أنت داخل باسم ${user.name}. اضغط «اربطه بحسابي» لإضافته إلى باقاتك.`,
    };
  }

  return {
    title: "استلم باكجك",
    description: "أنشئ حسابًا أو سجّل دخولك، وبعدها نربط الباكج بحسابك.",
  };
}

// بيانات الباكج والأزرار المناسبة لحالته
export default function PackDetails({ claim }) {
  const { pack, signedIn, ownedByMe, ownedByAnother } = claim;
  const { title, description } = getHeading(claim);

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
          <dt>رقم الباكج</dt>
          <dd>
            <bdi>{pack.id}</bdi>
          </dd>
        </div>

        <div className="claim-card__info-centered">
          <dt>الطور</dt>
          <dd>{getModeLabel(pack.mode)}</dd>
        </div>

        <div className="claim-card__info-centered">
          <dt>قطع NFC</dt>
          <dd>{pack.tags_count}</dd>
        </div>
      </dl>

      {actions}

      <p className="claim-card__note">رابط الاستلام يربط الباكج بحساب واحد.</p>
    </>
  );
}
