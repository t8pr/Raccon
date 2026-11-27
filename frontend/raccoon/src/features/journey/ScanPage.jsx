import { useState } from "react";
import { useSearchParams } from "react-router-dom";
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

  const tagHash = searchParams.get("tag");
  const userHash = searchParams.get("sig");

  const scan = useAutoScan(tagHash, userHash);
  const eventId = scan.scanResult?.event_id;
  // المتصدرون مباشر؛ userHash (من الرابط) يحدد صفّي أنا
  const leaderboard = useLeaderboard(eventId, userHash);
  // محطة اللوحة: closed (الرأس بس) · peek (3 صفوف) · open (10 صفوف)
  const [boardSnap, setBoardSnap] = useState("peek");

  // ---------- الخصائص المشتركة لكل الشاشات ----------
  const shell = {
    // المتصدرون متاحون فقط إذا عرفنا الجولة (المسح نجح)
    board: eventId
      ? {
          ...leaderboard,
          snap: boardSnap,
          onSnapChange: setBoardSnap,
        }
      : null,
    // لون الدائرة وخلفيتها: تسلسلي بنفسجي، صيد مفتوح أخضر.
    // النمط يجي من رد المسح، أو من رد الخطأ (حقتك من قبل، مو بالترتيب، استعد...)
    mode: scan.scanResult?.mode ?? scan.scanError?.mode,
  };

  if (scan.isLoading) {
    return <LoadingScreen shell={shell} />;
  }

  if (scan.error) {
    return <InvalidLinkScreen shell={shell} message={scan.error} />;
  }

  if (scan.scanError) {
    return <ScanErrorScreen shell={shell} scanError={scan.scanError} />;
  }

  if (!scan.scanResult) {
    return <EmptyScreen shell={shell} />;
  }

  return (
    <ScanResultScreen
      shell={shell}
      scanResult={scan.scanResult}
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
