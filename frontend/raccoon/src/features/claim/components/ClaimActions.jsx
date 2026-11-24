import Button from "../../../shared/ui/Button/Button";
import InlineMessage from "../../../shared/ui/InlineMessage/InlineMessage";
import { useTranslation } from "react-i18next";

// أزرار البطاقة حسب ملكية الباكج. عرض فقط؛ claim = ما يرجّعه useClaim.

// زائر: يدخل أو يسجّل أولًا
export function GuestActions({ claim }) {
  const { t } = useTranslation();
  return (
    <div className="claim-card__actions">
      <Button onClick={() => claim.goToAuth("/register")}>
        {t("authNav.register")}
      </Button>

      <Button variant="outline" onClick={() => claim.goToAuth("/login")}>
        {t("authNav.login")}
      </Button>
    </div>
  );
}

// الباكج لمستخدم آخر
export function OwnedByAnotherActions({ claim }) {
  const { t } = useTranslation();
  return (
    <div className="claim-card__actions">
      <Button variant="outline" onClick={() => claim.navigate("/packages")}>
        {t("claim.myPackages")}
      </Button>
    </div>
  );
}

// الباكج للمستخدم: يجهّزه الحين أو يرجع له من باقاتي
export function OwnedByMeActions({ claim }) {
  const { t } = useTranslation();
  const { eventsQuery, matchingEvents, targetEvent } = claim;

  return (
    <>
      <div className="claim-card__actions">
        <Button
          onClick={claim.openCustomization}
          loading={eventsQuery.isFetching}
          disabled={!targetEvent}
        >
          {t("claim.prepareNow")}
        </Button>

        <Button variant="outline" onClick={claim.openPackages}>
          {t("claim.myPackages")}
        </Button>
      </div>

      {eventsQuery.isError && (
        <>
          <InlineMessage
            type="error"
            message={t("claim.customizationLinkFailed")}
          />

          <Button
            variant="outline"
            loading={eventsQuery.isFetching}
            onClick={() => eventsQuery.refetch()}
          >
            {t("common.retry")}
          </Button>
        </>
      )}

      {eventsQuery.isSuccess && !targetEvent && (
        <>
          <InlineMessage
            type="warning"
            message={
              matchingEvents.length === 0
                ? t("claim.eventNotReady")
                : t("claim.multipleEvents")
            }
          />

          {matchingEvents.length === 0 && (
            <Button
              variant="outline"
              loading={eventsQuery.isFetching}
              onClick={() => eventsQuery.refetch()}
            >
              {t("common.refresh")}
            </Button>
          )}
        </>
      )}
    </>
  );
}

// الباكج بلا مالك والمستخدم داخل: «اربطه بحسابي»
export function ClaimButton({ claim }) {
  const { t } = useTranslation();
  const { claimMutation, previewQuery } = claim;
  const sessionExpired = claimMutation.error?.status === 401;

  return (
    <>
      <Button
        fullWidth
        loading={claimMutation.isPending}
        disabled={previewQuery.isFetching}
        onClick={claim.claim}
      >
        {t("claim.linkToMe")}
      </Button>

      {claimMutation.isError && (
        <>
          <InlineMessage
            type="error"
            message={
              sessionExpired
                ? t("claim.sessionExpired")
                : t("claim.linkFailed")
            }
          />

          {sessionExpired && (
            <Button variant="outline" onClick={() => claim.goToAuth("/login")}>
              {t("authNav.login")}
            </Button>
          )}
        </>
      )}
    </>
  );
}
