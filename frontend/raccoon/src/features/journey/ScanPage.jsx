import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext";
import { useAutoScan } from "./hooks/useAutoScan";
import { useLeaderboard } from "./hooks/useLeaderboard";
import {
  EmptyScreen,
  InvalidLinkScreen,
  LoadingScreen,
} from "./screens/StatusScreens";
import ScanErrorScreen from "./screens/ScanErrorScreen";
import ScanResultScreen from "./screens/ScanResultScreen";

/*
  صفحة المسح: اللاعب يمسح قطعة NFC فيُفتح هذا الرابط (/scan?tag=...&sig=...).

    useAutoScan      يرسل المسح للخادم مرة واحدة
    useLeaderboard   المتصدرون بعد نجاح المسح
    screens/         شاشة لكل نتيجة (تحميل، خطأ، نجاح، فخ)
  كل الشاشات تُبنى على ScanLayout فتبقى العناصر على نفس الخطوط.
*/
export default function ScanPage() {
  const [searchParams] = useSearchParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const tagHash = searchParams.get("tag");
  const userHash = searchParams.get("sig");

  const scan = useAutoScan(tagHash, userHash);
  const eventId = scan.scanResult?.event_id;
  const leaderboard = useLeaderboard(eventId, scan.scanResult);
  const [boardOpen, setBoardOpen] = useState(false);

  // ---------- الخصائص المشتركة لكل الشاشات ----------
  const myIndex = leaderboard.players.findIndex(
    (player) => player.user_hash === userHash,
  );

  const shell = {
    // المتصدرون متاحون فقط إذا عرفنا الجولة (المسح نجح)
    board: eventId
      ? {
          players: leaderboard.players,
          loading: leaderboard.loading,
          error: leaderboard.error,
          myHash: userHash,
          rank: myIndex === -1 ? null : myIndex + 1,
        }
      : null,
    boardOpen,
    onBoardOpenChange: setBoardOpen,
  };

  const goHome = () => navigate("/home");
  const openBoard = () => setBoardOpen(true);

  if (scan.isLoading) {
    return <LoadingScreen shell={shell} />;
  }

  if (scan.error) {
    return <InvalidLinkScreen shell={shell} message={scan.error} onHome={goHome} />;
  }

  if (scan.scanError) {
    return (
      <ScanErrorScreen shell={shell} scanError={scan.scanError} onHome={goHome} />
    );
  }

  if (!scan.scanResult) {
    return <EmptyScreen shell={shell} onHome={goHome} />;
  }

  return (
    <ScanResultScreen
      shell={shell}
      scanResult={scan.scanResult}
      onHome={goHome}
      onBoard={openBoard}
      // لقطع «اختر الفخ»: بيانات الزرع، وما يحدث بعده
      choose={{
        key: `${tagHash}:${userHash}:${accessToken}`,
        tagHash,
        userHash,
        onActivated: scan.markTrapSet,
      }}
    />
  );
}
