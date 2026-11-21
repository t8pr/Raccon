import { useQuery } from "@tanstack/react-query";

import { getMyEvents } from "../../../shared/api/eventsApi";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { toPackageItem } from "../packageItems";

// جولات المستخدم كبطاقات. تعديل الاسم صار في صفحة التخصيص.
export function useMyPackages(auth) {
  const { user, accessToken, isRestoring, restoreError } = auth;

  const signedIn = Boolean(
    user?.id && accessToken && !isRestoring && !restoreError,
  );

  // الأحداث التابعة للحساب؛ نحتاج event.id للتخصيص.
  const eventsQuery = useQuery({
    queryKey: queryKeys.myEvents(user?.id),
    queryFn: ({ signal }) => getMyEvents({ signal }),
    enabled: signedIn,
    staleTime: 0,
    retry: false,
  });

  const items = signedIn ? (eventsQuery.data ?? []).map(toPackageItem) : [];

  return { signedIn, eventsQuery, items };
}
