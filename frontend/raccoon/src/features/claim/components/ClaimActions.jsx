import Button from "../../../shared/ui/Button";
import InlineMessage from "../../../shared/ui/InlineMessage";

// أزرار البطاقة حسب ملكية الباكج. عرض فقط؛ claim = ما يرجّعه useClaim.

// زائر: يدخل أو يسجّل أولًا
export function GuestActions({ claim }) {
  return (
    <div className="claim-card__actions">
      <Button onClick={() => claim.goToAuth("/register")}>إنشاء حساب</Button>

      <Button variant="outline" onClick={() => claim.goToAuth("/login")}>
        تسجيل الدخول
      </Button>
    </div>
  );
}

// الباكج لمستخدم آخر
export function OwnedByAnotherActions({ claim }) {
  return (
    <div className="claim-card__actions">
      <Button variant="outline" onClick={() => claim.navigate("/packages")}>
        باقاتي
      </Button>
    </div>
  );
}

// الباكج للمستخدم: يجهّزه الحين أو يرجع له من باقاتي
export function OwnedByMeActions({ claim }) {
  const { eventsQuery, matchingEvents, targetEvent } = claim;

  return (
    <>
      <div className="claim-card__actions">
        <Button
          onClick={claim.openCustomization}
          loading={eventsQuery.isFetching}
          disabled={!targetEvent}
        >
          جهّزها الحين
        </Button>

        <Button variant="outline" onClick={claim.openPackages}>
          باقاتي
        </Button>
      </div>

      {eventsQuery.isError && (
        <>
          <InlineMessage
            type="error"
            message="الباكج مرتبط بحسابك، لكن تعذر تحميل رابط التخصيص."
          />

          <Button
            variant="outline"
            loading={eventsQuery.isFetching}
            onClick={() => eventsQuery.refetch()}
          >
            إعادة المحاولة
          </Button>
        </>
      )}

      {eventsQuery.isSuccess && !targetEvent && (
        <>
          <InlineMessage
            type="warning"
            message={
              matchingEvents.length === 0
                ? "حدث التخصيص لم يظهر بعد. حدّث البيانات."
                : "يوجد أكثر من حدث لهذا الباكج. اختره من صفحة باقاتي."
            }
          />

          {matchingEvents.length === 0 && (
            <Button
              variant="outline"
              loading={eventsQuery.isFetching}
              onClick={() => eventsQuery.refetch()}
            >
              تحديث
            </Button>
          )}
        </>
      )}
    </>
  );
}

// الباكج بلا مالك والمستخدم داخل: «اربطه بحسابي»
export function ClaimButton({ claim }) {
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
        اربطه بحسابي
      </Button>

      {claimMutation.isError && (
        <>
          <InlineMessage
            type="error"
            message={
              sessionExpired
                ? "انتهت جلسة الدخول. سجّل دخولك لإكمال الربط."
                : "تعذر ربط الباكج. حاول مرة أخرى."
            }
          />

          {sessionExpired && (
            <Button variant="outline" onClick={() => claim.goToAuth("/login")}>
              تسجيل الدخول
            </Button>
          )}
        </>
      )}
    </>
  );
}
