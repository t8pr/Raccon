import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useAuth } from "../../../shared/auth/AuthContext";
import { API_URL } from "../../../shared/api/apiClient";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { getLeaderboard } from "../api";
import i18n from "../../../i18n";

/*
  المتصدرون لجولة واحدة، مباشر. البيانات بشكل واحد: { top, me }
    top  أول 10 (كل صف فيه rank)
    me   صفّي أنا بترتيبي الحقيقي (حتى لو 30)، أو null لو ما لعبت

  1. useQuery          يجيبها مرة وحدة (GET): الخادم يرجّع أول 10، وصفّي آخرها لو أنا برا العشرة
  2. fetchEventSource  يفتح البث (SSE) ويحدّث نفس الكاش كل ما أحد مسح قطعة:
       event: leaderboard  أول 10 الجدد (للكل)
       event: player       صفّي أنا (لي بس)
  fetchEventSource بدل EventSource لأن البث يحتاج التوكن في الهيدر، وEventSource ما يقبل هيدرز.
*/
export function useLeaderboard(eventId, myHash) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const enabled = Boolean(eventId && accessToken);
  const key = queryKeys.leaderboard(eventId, accessToken);

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const list = await getLeaderboard(eventId);
      return {
        top: list.filter((player) => player.rank <= 10),
        me: list.find((player) => player.user_hash === myHash) ?? null,
      };
    },
    enabled,
  });

  useEffect(() => {
    if (!enabled) return;

    // نسكّر البث لما يطلع اللاعب من الصفحة
    const controller = new AbortController();
    // أول فتح؟ (الـ GET أصلًا شغّال وقتها، فما نعيده)
    let firstOpen = true;

    fetchEventSource(
      `${API_URL}/journey/leaderboard/${encodeURIComponent(eventId)}/stream`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,

        onmessage(message) {
          // سطور heartbeat توصل بلا data؛ نتجاهلها
          if (!message.data) return;
          const data = JSON.parse(message.data);

          queryClient.setQueryData(key, (old = { top: [], me: null }) => {
            if (message.event === "player") {
              return { ...old, me: data };
            }
            // leaderboard: أول 10 الجدد، ولو أنا منهم ناخذ صفّي منهم (أحدث)
            const meInTop = data.find((player) => player.user_hash === myHash);
            return { top: data, me: meInTop ?? old.me };
          });
        },

        // الخادم رفض (401، 503 لو Redis واقف...): نعلّم الخطأ بـ status
        async onopen(response) {
          if (!response.ok) {
            const error = new Error("stream rejected");
            error.status = response.status;
            throw error;
          }
          // البث رجع بعد انقطاع (نت، قفل شاشة الجوال...): يمكن فاتنا تحديث وقتها،
          // فنعيد الـ GET. React Query يجيبها من جديد ويحدّث الشاشة
          if (!firstOpen) queryClient.invalidateQueries({ queryKey: key });
          firstOpen = false;
        },
        // رفض من الخادم = نوقف (وتبقى البيانات من الـ GET)
        // انقطاع نت = نعيد المحاولة بعد 5 ثواني
        onerror(error) {
          if (error.status) throw error;
          return 5000;
        },
      },
    ).catch(() => {});

    return () => controller.abort();
    // key مبني من eventId و accessToken، فما نحتاجه هنا
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, eventId, accessToken, myHash, queryClient]);

  return {
    top: query.data?.top ?? [],
    me: query.data?.me ?? null,
    loading: query.isLoading,
    error: query.isError ? i18n.t("journey.board.loadFailed") : "",
  };
}
