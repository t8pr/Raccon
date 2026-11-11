import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { scanTagData } from "../../api/journeyApi";
import AppNavbar from "../../components/layout/AppNavbar";
import { useAuth } from "../../context/AuthContext";
import { getLeaderboard } from "../../api/journeyApi";
import ChooseTrap from "../../components/journey/ChooseTrap";
import FreezeView from "../../components/journey/FreezeView";

import {
  StatusHero,
  NotLiveHero,
  BoomHero,
} from "../../components/journey/ScanUI";
import { ClaimedHero, MentoCharacter } from "../../components/journey/ScanUI";

function TagContent({ content }) {
  return (
    <>
      {content?.hint && (
        <p style={{ fontSize: "18px" }}>
          <strong>التلميح:</strong> {content.hint}
        </p>
      )}

      {content?.image && (
        <img
          src={content.image}
          alt="تلميح"
          style={{ maxWidth: "100%", borderRadius: "8px", marginTop: "10px" }}
        />
      )}
    </>
  );
}

export default function ScanPage() {
  const [searchParams] = useSearchParams();
  const { accessToken } = useAuth();

  const tagHash = searchParams.get("tag");
  const userHash = searchParams.get("sig");

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
              },
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
          <FreezeView
            tagNumber={scanError.tag_sequence}
            currentScore={scanError.current_score}
            remainingTags={scanError.remaining_tags}
            frozenUntil={scanError.frozen_until}
          />
        );
        break;

      case "skipped_tag": {
        const expectedTag = scanError.message?.match(/\d+/)?.[0] ?? "?";
        view = (
          <>
            <StatusHero number={expectedTag} />
            <h2>تجاهلت تاق!</h2>
            <p>لازم تسكّن التاق رقم {expectedTag} أول</p>
          </>
        );
        break;
      }

      default:
        if (scanError.message === "This event is not live.") {
          view = (
            <div className="scan-status">
              <NotLiveHero />
              <h2 className="scan-status__title">الجولة مو شغّالة الحين</h2>
              <p className="scan-status__desc">
                صاحب اللعبة ما شغّلها أو وقّفها مؤقتًا. امسح القطعة مرة ثانية
                لما تشتغل.
              </p>
            </div>
          );
        } else {
          view = <p>{scanError.message || "تعذر قراءة البطاقة."}</p>;
        }
        break;
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
          <ChooseTrap
            key={`${tagHash}:${userHash}:${accessToken}`}
            tagHash={tagHash}
            userHash={userHash}
            accessToken={accessToken}
            tagNumber={scanResult.tag_sequence}
            currentScore={scanResult.current_score}
            remainingTags={scanResult.remaining_tags}
            onActivated={(result) => {
              setScanResult((current) =>
                current === scanResult
                  ? {
                      ...current,
                      status: "trap_set",
                      content: result.content,
                    }
                  : current,
              );
            }}
          />
        );
      } else if (content?.boom) {
        view = (
          <div className="scan-status scan-status--boom">
            <div className="scan-status__chips">
              <span className="scan-chip">
                نقاطك {scanResult.current_score}
              </span>
              <span className="scan-chip">
                باقي {scanResult.remaining_tags} قطع
              </span>
            </div>
            <BoomHero lost={content.boom} />
          </div>
        );
      } else if (content?.freeze) {
        view = (
          <FreezeView
            tagNumber={scanResult.tag_sequence}
            currentScore={scanResult.current_score}
            remainingTags={scanResult.remaining_tags}
            freezeSeconds={content.freeze}
          />
        );
      } else {
        view = <p>Empty trap.</p>;
      }
    } else {
      const progress = scanResult.current_score ?? 0;
      const total = progress + (scanResult.remaining_tags ?? 0);
      view = (
        <div className="scan-status scan-status--claimed">
          <div className="scan-status__chips">
            <span className="scan-chip">نقاطك {scanResult.current_score}</span>
            <span className="scan-chip">
              باقي {scanResult.remaining_tags} قطع
            </span>
          </div>

          <ClaimedHero tagNumber={progress} />

          <MentoCharacter />

          <div className="scan-status__piece-pill">
            القطعة {progress} من {total}
          </div>

          {scanResult.event_finished && (
            <p className="scan-status__desc">اكتملت الجولة!</p>
          )}
        </div>
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
