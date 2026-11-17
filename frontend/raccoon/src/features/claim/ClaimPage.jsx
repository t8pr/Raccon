import { useParams } from "react-router-dom";

import Chip from "../../shared/ui/Chip";
import Mark from "../../assets/Mark.png";
import { useAuth } from "../../shared/auth/AuthContext";

import { useClaim } from "./hooks/useClaim";
import PackDetails from "./components/PackDetails";
import {
  CheckingState,
  InvalidLinkState,
  MissingPackState,
  PreviewErrorState,
  RestoreErrorState,
} from "./components/ClaimStates";
import "./ClaimPage.css";

/*
  صفحة استلام الباكج: المستخدم يفتح رابط الإيميل ويربط الباكج بحسابه.
  المنطق في useClaim، والمحتوى حسب الحالة في components/.
*/
export default function ClaimPage() {
  const { masterAuthHash } = useParams();
  const auth = useAuth();

  // إعادة حالة الصفحة إذا تغير الرابط أو المستخدم.
  return (
    <ClaimContent
      key={`${masterAuthHash}:${auth.user?.id ?? "guest"}`}
      masterAuthHash={masterAuthHash}
      auth={auth}
    />
  );
}

function ClaimContent({ masterAuthHash, auth }) {
  const claim = useClaim(masterAuthHash, auth);
  const { validHash, isRestoring, restoreError, previewQuery, pack } = claim;

  let content;

  if (!validHash) {
    content = <InvalidLinkState />;
  } else if (previewQuery.isPending || isRestoring) {
    content = <CheckingState />;
  } else if (restoreError) {
    content = <RestoreErrorState message={restoreError} />;
  } else if (previewQuery.isError) {
    content = (
      <PreviewErrorState
        notFound={previewQuery.error?.status === 404}
        retrying={previewQuery.isFetching}
        onRetry={() => previewQuery.refetch()}
      />
    );
  } else if (pack) {
    content = <PackDetails claim={claim} />;
  } else {
    content = <MissingPackState />;
  }

  // شارة الملكية فوق البطاقة
  const showBadge =
    validHash &&
    !isRestoring &&
    !restoreError &&
    !previewQuery.isError &&
    (claim.ownedByMe || claim.ownedByAnother);

  return (
    <div className="claim-view" dir="rtl">
      <header className="claim-nav">
        <img src={Mark} alt="راكون" />
      </header>

      <section className="claim-page" aria-labelledby="claim-title">
        <article className="claim-card">
          <div className="claim-card__cover">
            <span
              className="claim-card__mark"
              aria-hidden="true"
              style={{
                maskImage: `url(${Mark})`,
                WebkitMaskImage: `url(${Mark})`,
              }}
            />

            {showBadge && (
              <div className="claim-card__badge">
                <Chip tone={claim.ownedByMe ? "mint" : "error"}>
                  {claim.ownedByMe ? "تم ربطه بحسابك" : "مربوط بحساب آخر"}
                </Chip>
              </div>
            )}
          </div>

          <div className="claim-card__body">{content}</div>
        </article>
      </section>
    </div>
  );
}
