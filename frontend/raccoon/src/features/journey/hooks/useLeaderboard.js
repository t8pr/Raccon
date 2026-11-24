import { useEffect, useState } from "react";
import { useAuth } from "../../../shared/auth/AuthContext";
import { getLeaderboard } from "../api";
import i18n from "../../../i18n";

// المتصدرون لجولة واحدة. refreshKey: أي قيمة تتغيّر تعيد التحميل (نتيجة المسح هنا).
export function useLeaderboard(eventId, refreshKey) {
  const { accessToken } = useAuth();

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eventId || !accessToken) return;

    let active = true;

    setPlayers([]);
    setLoading(true);
    setError("");

    async function loadLeaderboard() {
      try {
        const result = await getLeaderboard(eventId);

        if (active) {
          setPlayers(result);
        }
      } catch {
        if (active) {
          setError(i18n.t("journey.board.loadFailed"));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadLeaderboard();

    return () => {
      active = false;
    };
  }, [eventId, accessToken, refreshKey]);

  return { players, loading, error };
}
