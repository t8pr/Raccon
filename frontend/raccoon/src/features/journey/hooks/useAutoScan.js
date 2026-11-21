import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../shared/auth/AuthContext";
import { scanTagData } from "../api";
import { toScanError } from "../utils/scanErrors";

/*
  يمسح القطعة تلقائيًا بمجرد فتح الصفحة.

  الطلب يُرسل مرة واحدة لكل (قطعة، لاعب، توكن): StrictMode في التطوير يشغّل الـeffect مرتين،
  والمسح يغيّر النقاط في الخادم، فنعيد استخدام نفس الطلب بدل إرسال طلب ثانٍ.

  يرجّع واحدًا فقط من: isLoading · error (رابط ناقص) · scanError (رد خطأ من الخادم) · scanResult
*/
export function useAutoScan(tagHash, userHash) {
  const { accessToken } = useAuth();

  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [scanError, setScanError] = useState(null);
  const scanRequest = useRef(null);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setScanResult(null);
    setScanError(null);
    setError("");

    async function executeAutoScan() {
      if (!tagHash || !userHash) {
        setError("رابط غير صالح أو بيانات مفقودة.");
        setIsLoading(false);
        return;
      }

      if (!accessToken) return;

      const previous = scanRequest.current;
      if (
        !previous ||
        previous.tagHash !== tagHash ||
        previous.userHash !== userHash ||
        previous.accessToken !== accessToken
      ) {
        scanRequest.current = {
          tagHash,
          userHash,
          accessToken,
          promise: scanTagData(tagHash, userHash),
        };
      }

      try {
        const data = await scanRequest.current.promise;
        if (!active) return;
        setScanResult(data);
      } catch (err) {
        if (!active) return;
        setScanError(toScanError(err));
      } finally {
        if (active) setIsLoading(false);
      }
    }

    executeAutoScan();

    return () => {
      active = false;
    };
  }, [tagHash, userHash, accessToken]);

  // بعد ما يزرع اللاعب الفخ نحدّث النتيجة محليًا بدل مسح جديد.
  // نتجاهل التحديث إذا تغيّرت النتيجة في الأثناء (مسح قطعة ثانية).
  function markTrapSet(trapResult) {
    setScanResult((current) =>
      current === scanResult
        ? { ...current, status: "trap_set", content: trapResult.content }
        : current,
    );
  }

  return { isLoading, error, scanError, scanResult, markTrapSet };
}
