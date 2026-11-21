import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { previewPack, claimPack } from "../api";
import { getMyEvents } from "../../../shared/api/eventsApi";
import { claimHashSchema } from "../../../shared/utils/validation";
import { rememberClaimReturn } from "../../../shared/utils/claimReturn";
import { queryKeys } from "../../../shared/constants/queryKeys";

/*
  ربط باكج بحساب المستخدم عبر رابط الاستلام (/claim/:masterAuthHash).

  الخطوات:
    1. تحقق محلي من صيغة الرابط
    2. معاينة الباكج من الخادم (لمن هو؟)
    3. إذا ما له مالك والمستخدم داخل: «اربطه بحسابي»
    4. إذا صار للمستخدم: نجلب جولته حتى يفتح التخصيص مباشرة

  auth: ما يرجّعه useAuth (الصفحة تمرّره لأنها تعيد بناء المحتوى عند تغيّر المستخدم).
*/
export function useClaim(masterAuthHash, auth) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // يمنع إرسال طلب ربط ثانٍ قبل انتهاء الأول
  const claimLockRef = useRef(false);

  const { user, accessToken, isRestoring, restoreError } = auth;

  const signedIn = Boolean(user?.id && accessToken);

  // تحقق محلي قبل إرسال أي طلب.
  const hashResult = claimHashSchema.safeParse(masterAuthHash);
  const validHash = hashResult.success;

  const previewKey = queryKeys.packPreview(masterAuthHash, user?.id);

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
    queryKey: queryKeys.claimEvents(user?.id, pack?.id),
    queryFn: ({ signal }) => getMyEvents({ signal }),
    enabled:
      ownedByMe && !isRestoring && !restoreError && !previewQuery.isError,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  const matchingEvents = (eventsQuery.data ?? []).filter(
    (event) => event.pack_id === pack?.id,
  );

  // زر «جهّزها الحين» يعمل فقط إذا وُجدت جولة واحدة بالضبط لهذا الباكج
  const targetEvent = matchingEvents.length === 1 ? matchingEvents[0] : null;

  const claimMutation = useMutation({
    mutationFn: () => claimPack(masterAuthHash),

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
      queryClient.setQueryData(
        queryKeys.packInfo(user.id, ownedPack.id),
        ownedPack,
      );

      void queryClient.invalidateQueries({
        queryKey: queryKeys.myEvents(user.id),
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

  // يحفظ الرابط حتى يرجع المستخدم هنا بعد الدخول أو التسجيل
  function goToAuth(path) {
    if (!validHash) return;

    rememberClaimReturn(`/claim/${hashResult.data}`);
    navigate(path);
  }

  function claim() {
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

    queryClient.setQueryData(queryKeys.packInfo(user.id, pack.id), pack);
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

  return {
    user,
    isRestoring,
    restoreError,
    signedIn,
    validHash,
    pack,
    ownedByMe,
    ownedByAnother,
    previewQuery,
    eventsQuery,
    matchingEvents,
    targetEvent,
    claimMutation,
    goToAuth,
    claim,
    openPackages,
    openCustomization,
    navigate,
  };
}
