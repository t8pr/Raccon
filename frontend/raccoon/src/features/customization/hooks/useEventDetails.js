import { useQuery } from "@tanstack/react-query";
import { getEventDetails } from "../../../shared/api/eventsApi";
import { useAuth } from "../../../shared/auth/AuthContext";
import { queryKeys } from "../../../shared/constants/queryKeys";

// تفاصيل الجولة: العنوان، الحالة، عدد التعديلات، والقطع.
export function useEventDetails(eventId) {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: queryKeys.event(eventId, accessToken),
    queryFn: () => getEventDetails(eventId),
    enabled: Boolean(eventId && accessToken),
  });
}
