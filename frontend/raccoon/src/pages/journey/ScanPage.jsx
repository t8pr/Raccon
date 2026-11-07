import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { scanTagData } from "../../api/journeyApi";
import AppNavbar from "../../components/layout/AppNavbar";
import { useAuth } from "../../context/AuthContext";
import { getLeaderboard } from "../../api/journeyApi";
import ChooseTrap from "../../components/journey/ChooseTrap";

function TagContent({ content }) {
  return (
    <>
      {content?.hint && <p>{content.hint}</p>}

      {/* image */}
    </>
  );
}

export default function ScanPage() {
  const [searchParams] = useSearchParams();
  const { accessToken } = useAuth();
  
  const tagHash = searchParams.get("tag");
  const userHash = searchParams.get("user");
  
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [scanError, setScanError] = useState(null);
  const scanRequest = useRef(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");

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
          promise: scanTagData(tagHash, userHash, accessToken),
        };
      }

      try {
        const data = await scanRequest.current.promise;
        if (!active) return;
        setScanResult(data);
      } catch (err) {
        if (!active) return;
        const detail = err.detail;

        setScanError(
          typeof detail === "string"
            ? { code: "unknown", message: detail }
            : detail || {
                code: "unknown",
                message: "تعذر قراءة البطاقة.",
              }
        );
      } finally {
        if (active) setIsLoading(false);
      }
    }

    executeAutoScan();

    return () => {
      active = false;
    };
  }, [tagHash, userHash, accessToken]);

  const eventId = scanResult?.event_id;

  useEffect(() => {
    if (!eventId || !accessToken) return;

    let active = true;

    setLeaderboard([]);
    setLeaderboardLoading(true);
    setLeaderboardError("");

    async function loadLeaderboard() {
      try {
        const players = await getLeaderboard(eventId, accessToken);

        if (active) {
          setLeaderboard(players);
        }
      } catch {
        if (active) {
          setLeaderboardError("تعذر تحميل المتصدرين.");
        }
      } finally {
        if (active) {
          setLeaderboardLoading(false);
        }
      }
    }

    loadLeaderboard();

    return () => {
      active = false;
    };
  }, [eventId, accessToken, scanResult]);

  let view;

  if (isLoading) {
    view = <p>جاري قراءة البطاقة...</p>;
  } else if (error) {
    view = <p>{error}</p>;
  } else if (scanError) {
    switch (scanError.code) {
      case "already_scanned":
        view = (
          <>
            <p>حقتك من قبل!</p>
            <TagContent content={scanError.content} />
            <p>هذا تلميح القطعة مرة ثانية — نقاطك ما تغيّرت.</p>
          </>
        );
        break;

      case "claimed_by_another_player":
        view = (
          <>
            <h2>سبقك غيرك!</h2>
            <p>دوّر على قطعة ثانية بسرعة</p>
          </>
        );
        break;

      case "freeze":
        view = (
          <>
            <h2>تجمدت!</h2>
            <p>
               لا تقدر تمسح حتى ينتهي العدّاد  
              {" "}
              {new Date(scanError.frozen_until).toLocaleTimeString("ar-SA")}
            </p>
          </>
        );
        break;

      case "skipped_tag":
        view = (
          <>
            <h2>تجاهلت تاق!</h2>
            <p>{scanError.message}</p>
          </>
        );
        break;

      default:
        view = <p>{scanError.message || "تعذر قراءة البطاقة."}</p>;
    }
  } else if (scanResult) {
    const content = scanResult.content;

    if (scanResult.status === "view_only") {
      view = (
        <>
          <p>انتهت الجولة</p>
          <h1>{scanResult.tag_sequence}</h1>
          <TagContent content={content} />

          {scanResult.tag_type === "trap" && (
            <p>هذه بطاقة فخ. لن يتم تطبيق أي تأثير.</p>
          )}
        </>
      );
    } else if (scanResult.tag_type === "trap") {
      if (scanResult.status === "trap_set" && content?.was_choose) {
        view = (
          <>
            <h1>{scanResult.tag_sequence}</h1>
            <h2>تم تفعيل الفخ!</h2>
            <p>
              {content.boom
                ? "سيخصم الفخ نقطة من اللاعبين القادمين."
                : `سيجمّد الفخ اللاعبين القادمين لمدة ${content.freeze} ثانية.`}
            </p>
            <p>نقاطك لم تتغير.</p>
          </>
        );
      } else if (content?.choose) {
        view = (
          <>
            <h1>{scanResult.tag_sequence}</h1>
            <h2>اختر نوع الفخ</h2>
            <ChooseTrap
              key={`${tagHash}:${userHash}:${accessToken}`}
              tagHash={tagHash}
              userHash={userHash}
              accessToken={accessToken}
              onActivated={(result) => {
                setScanResult((current) => current === scanResult ? {
                  ...current,
                  status: "trap_set",
                  content: result.content,
                } : current);
              }}
            />
          </>
        );
      } else if (content?.boom) {
        view = (
          <>
            <h1>{scanResult.tag_sequence}</h1>
            <h2>بووم!</h2>
            <p>-{content.boom}</p>
            <p>نقاطك الحالية: {scanResult.current_score}</p>
          </>
        );
      } else if (content?.freeze) {
        view = (
          <>
            <h1>{scanResult.tag_sequence}</h1>
            <h2>تجمدت!</h2>
            <p>{content.freeze}</p>
          </>
        );
      } else {
        view = <p>Empty trap.</p>;
      }
    } else {
      view = (
        <>
          <h1>{scanResult.tag_sequence}</h1>
          <TagContent content={content} />

          <p>نقاطك: {scanResult.current_score}</p>
          <p>البطاقات المتبقية لك: {scanResult.remaining_tags}</p>

          {scanResult.event_finished && <p>اكتملت الجولة!</p>}
        </>
      );
    }
  } else {
    view = <p>لا توجد بيانات لعرضها.</p>;
  }

  return (
  <div dir="rtl">
    <AppNavbar />

    <section className="home-page">
      {view}

      {eventId && (
        <section>
          <h2>المتصدرون</h2>

          {leaderboardLoading ? (
            <p>جاري تحميل المتصدرين...</p>
          ) : leaderboardError ? (
            <p>{leaderboardError}</p>
          ) : leaderboard.length === 0 ? (
            <p>لا يوجد مشاركون بعد.</p>
          ) : (
            <ol>
              {leaderboard.map((player) => (
                <li key={player.user_hash}>
                  {player.name} — {player.score}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </section>
  </div>
);
}
