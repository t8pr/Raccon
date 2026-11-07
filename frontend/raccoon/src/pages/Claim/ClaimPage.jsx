import { useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";
import InlineMessage from "../../components/ui/InlineMessage";
import Mark from "../../assets/Mark.png";

import { useAuth } from "../../context/AuthContext";
import { previewPack, claimPack } from "../../api/packs/packsApi";
import { getMyEvents } from "../../api/events/eventsApi";

import { claimHashSchema } from "../../utils/validation";
import { rememberClaimReturn } from "../../utils/claimReturn";

const modeLabels = { seq: "تسلسلي", open: "صيد مفتوح" };

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const claimLockRef = useRef(false);

  const { user, accessToken, isRestoring, restoreError } = auth;

  const signedIn = Boolean(user?.id && accessToken);

  // تحقق محلي قبل إرسال أي طلب.
  const hashResult = claimHashSchema.safeParse(masterAuthHash);
  const validHash = hashResult.success;

  const previewKey = ["pack-preview", masterAuthHash, user?.id ?? "guest"];

  const previewQuery = useQuery({
    queryKey: previewKey,
    queryFn: ({ signal }) => previewPack(masterAuthHash, { signal }),
    enabled: validHash,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  const pack = previewQuery.data;

  const ownedByMe = Boolean(signedIn && pack?.owner_id === user.id);

  const ownedByAnother = Boolean(
    signedIn && pack?.owner_id && pack.owner_id !== user.id,
  );

  // نحتاج الحدث المرتبط بالباكج لزر التخصيص.
  const eventsQuery = useQuery({
    queryKey: ["claim-events", user?.id, pack?.id],
    queryFn: ({ signal }) => getMyEvents(accessToken, { signal }),
    enabled:
      ownedByMe && !isRestoring && !restoreError && !previewQuery.isError,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  const matchingEvents = (eventsQuery.data ?? []).filter(
    (event) => event.pack_id === pack?.id,
  );

  const targetEvent = matchingEvents.length === 1 ? matchingEvents[0] : null;

  const claimMutation = useMutation({
    mutationFn: () => claimPack(accessToken, masterAuthHash),

    // لا نعيد طلب تغيير الملكية تلقائيًا.
    retry: false,

    onSuccess: async (ownedPack) => {
      // منع رد معاينة قديم من استبدال الملكية الجديدة.
      await queryClient.cancelQueries({
        queryKey: previewKey,
        exact: true,
      });

      queryClient.setQueryData(previewKey, ownedPack);

      // بيانات عرض لصفحة باقاتي؛ ليست مصدر إثبات الملكية.
      queryClient.setQueryData(["pack-info", user.id, ownedPack.id], ownedPack);

      void queryClient.invalidateQueries({
        queryKey: ["my-events", user.id],
      });
    },

    onError: async () => {
      // إذا ضاع رد الربط، نتحقق من الملكية قبل إعادة المحاولة.
      await previewQuery.refetch();
    },

    onSettled: () => {
      claimLockRef.current = false;
    },
  });

  function goToAuth(path) {
    if (!validHash) return;

    rememberClaimReturn(`/claim/${hashResult.data}`);
    navigate(path);
  }

  function handleClaim() {
    if (
      !validHash ||
      !signedIn ||
      !pack ||
      pack.owner_id !== null ||
      isRestoring ||
      restoreError ||
      previewQuery.isError ||
      previewQuery.isFetching ||
      claimLockRef.current
    ) {
      return;
    }

    claimLockRef.current = true;
    claimMutation.mutate();
  }

  function rememberPackInfo() {
    if (!ownedByMe) return;

    queryClient.setQueryData(["pack-info", user.id, pack.id], pack);
  }

  function openPackages() {
    rememberPackInfo();
    navigate("/packages");
  }

  function openCustomization() {
    if (!targetEvent) return;

    rememberPackInfo();

    navigate(`/customization/${encodeURIComponent(targetEvent.id)}`);
  }

  let title = "استلم باكجك";
  let description = "أنشئ حسابًا أو سجّل دخولك، وبعدها نربط الباكج بحسابك.";

  if (signedIn && pack?.owner_id === null) {
    title = "حزمتك جاهزة، باقي نربطها باسمك";
    description = `أنت داخل باسم ${user.name}. اضغط «اربطه بحسابي» لإضافته إلى باقاتك.`;
  }

  if (ownedByMe) {
    title = claimMutation.isSuccess
      ? "ألف مبروك، تم ربط الحزمة بك!"
      : "هذه الحزمة مرتبطة بحسابك";

    description = "تقدر تجهّزها الحين أو ترجع لها لاحقًا من صفحة باقاتي.";
  }

  if (ownedByAnother) {
    title = "تم ربط الحزمة بمستخدم آخر";
    description =
      "كل باكج يرتبط بحساب واحد. إذا استلمته بحسابك الآخر، سجّل الدخول بذلك الحساب.";
  }

  let content;

  if (!validHash) {
    content = (
      <>
        <h1 id="claim-title">رابط الاستلام غير صالح</h1>
        <InlineMessage
          type="error"
          message="تأكد من فتح الرابط الكامل الذي وصلك في الإيميل."
        />
      </>
    );
  } else if (previewQuery.isPending || isRestoring) {
    content = (
      <>
        <h1 id="claim-title">استلم باكجك</h1>
        <InlineMessage message="جارٍ التحقق من الباكج والحساب..." />
      </>
    );
  } else if (restoreError) {
    content = (
      <>
        <h1 id="claim-title">تعذر التحقق من الحساب</h1>
        <InlineMessage type="error" message={restoreError} />
        <Button onClick={() => window.location.reload()}>إعادة المحاولة</Button>
      </>
    );
  } else if (previewQuery.isError) {
    content = (
      <>
        <h1 id="claim-title">تعذر تحميل الباكج</h1>

        <InlineMessage
          type="error"
          message={
            previewQuery.error?.status === 404
              ? "الباكج غير موجود. تأكد من رابط الاستلام."
              : "تعذر الاتصال بالخادم. حاول مرة أخرى."
          }
        />

        <Button
          variant="outline"
          loading={previewQuery.isFetching}
          onClick={() => previewQuery.refetch()}
        >
          إعادة المحاولة
        </Button>
      </>
    );
  } else if (pack) {
    content = (
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
            <dd>{modeLabels[pack.mode] ?? "غير محدد"}</dd>
          </div>

          <div className="claim-card__info-centered">
            <dt>قطع NFC</dt>
            <dd>{pack.tags_count}</dd>
          </div>
        </dl>

        {!signedIn ? (
          <div className="claim-card__actions">
            <Button onClick={() => goToAuth("/register")}>إنشاء حساب</Button>

            <Button variant="outline" onClick={() => goToAuth("/login")}>
              تسجيل الدخول
            </Button>
          </div>
        ) : ownedByAnother ? (
          <div className="claim-card__actions">
            <Button variant="outline" onClick={() => navigate("/packages")}>
              باقاتي
            </Button>
          </div>
        ) : ownedByMe ? (
          <>
            <div className="claim-card__actions">
              <Button
                onClick={openCustomization}
                loading={eventsQuery.isFetching}
                disabled={!targetEvent}
              >
                جهّزها الحين
              </Button>

              <Button variant="outline" onClick={openPackages}>
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
        ) : (
          <>
            <Button
              fullWidth
              loading={claimMutation.isPending}
              disabled={previewQuery.isFetching}
              onClick={handleClaim}
            >
              اربطه بحسابي
            </Button>

            {claimMutation.isError && (
              <>
                <InlineMessage
                  type="error"
                  message={
                    claimMutation.error?.status === 401
                      ? "انتهت جلسة الدخول. سجّل دخولك لإكمال الربط."
                      : "تعذر ربط الباكج. حاول مرة أخرى."
                  }
                />

                {claimMutation.error?.status === 401 && (
                  <Button variant="outline" onClick={() => goToAuth("/login")}>
                    تسجيل الدخول
                  </Button>
                )}
              </>
            )}
          </>
        )}

        <p className="claim-card__note">
          رابط الاستلام يربط الباكج بحساب واحد.
        </p>
      </>
    );
  } else {
    content = <InlineMessage type="error" message="لم تتوفر معلومات الباكج." />;
  }

  const showBadge =
    validHash &&
    !isRestoring &&
    !restoreError &&
    !previewQuery.isError &&
    (ownedByMe || ownedByAnother);

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
                <Chip tone={ownedByMe ? "mint" : "error"}>
                  {ownedByMe ? "تم ربطه بحسابك" : "مربوط بحساب آخر"}
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
