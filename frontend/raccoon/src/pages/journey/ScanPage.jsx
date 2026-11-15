import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getLeaderboard, scanTagData } from "../../api/journeyApi";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import ScanLayout from "../../components/journey/ScanLayout";
import HintCard from "../../components/journey/HintCard";
import InfoCard, { ScanNote } from "../../components/journey/InfoCard";
import ChooseTrap from "../../components/journey/ChooseTrap";
import FreezeView from "../../components/journey/FreezeView";
import {
  BombBadge,
  CheckBadge,
  CupBadge,
  FlagBadge,
  FreezeBadge,
  LockBadge,
  MarkBadge,
  NumberBadge,
} from "../../components/journey/ScanBadges";

const pad = (value) => String(value ?? "").padStart(2, "0");

// أخطاء يرجعها الخادم كنص فقط (بدون code)
function errorKind(scanError) {
  const message = scanError?.message ?? "";

  if (scanError?.code && scanError.code !== "unknown") return scanError.code;
  if (message === "This event is not live.") return "not_live";
  if (message.startsWith("Security Violation")) return "not_yours";
  if (message.startsWith("You have already completed")) return "completed";
  return "unknown";
}

export default function ScanPage() {
  const [searchParams] = useSearchParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();

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
  const [boardOpen, setBoardOpen] = useState(false);

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

  // ---------- الخصائص المشتركة لكل الشاشات ----------
  const myIndex = leaderboard.findIndex(
    (player) => player.user_hash === userHash,
  );

  const shell = {
    // المتصدرون متاحون فقط إذا عرفنا الجولة (المسح نجح)
    board: eventId
      ? {
          players: leaderboard,
          loading: leaderboardLoading,
          error: leaderboardError,
          myHash: userHash,
          rank: myIndex === -1 ? null : myIndex + 1,
        }
      : null,
    boardOpen,
    onBoardOpenChange: setBoardOpen,
  };

  const goHome = () => navigate("/home");
  const openBoard = () => setBoardOpen(true);

  const homeButton = <Button onClick={goHome}>رجوع للرئيسية</Button>;
  const continueButton = (label = "كمّل البحث") => (
    <Button onClick={goHome}>{label}</Button>
  );

  // ---------- التحميل ----------
  if (isLoading) {
    return (
      <ScanLayout
        {...shell}
        showStats={false}
        title="لحظة..."
        badge={<MarkBadge />}
        pill="جاري قراءة القطعة"
      />
    );
  }

  // ---------- رابط ناقص ----------
  if (error) {
    return (
      <ScanLayout
        {...shell}
        showStats={false}
        title="رابط غير صالح"
        badge={<LockBadge />}
        pill="ما قدرنا نقرأ الرابط"
        actions={homeButton}
      >
        <InfoCard title={error} text="امسح القطعة مرة ثانية بجوالك." />
      </ScanLayout>
    );
  }

  // ---------- أخطاء المسح ----------
  if (scanError) {
    const stats = {
      score: scanError.current_score,
      remaining: scanError.remaining_tags,
      showStats: scanError.current_score != null,
    };

    switch (errorKind(scanError)) {
      case "already_scanned":
        return (
          <ScanLayout
            {...shell}
            {...stats}
            title="حقتك من قبل"
            tone="mint"
            badge={<CheckBadge />}
            pill="ما تنضاف نقطة ثانية"
            actions={continueButton("كمّل اللعب")}
          >
            <HintCard
              text={scanError.content?.hint}
              image={scanError.content?.image}
            />
            <ScanNote>هذا تلميح القطعة مرة ثانية — نقاطك ما تغيّرت.</ScanNote>
          </ScanLayout>
        );

      case "claimed_by_another_player": {
        // "Sorry, {name} claimed this tag before you!"
        const claimer = scanError.message?.match(/^Sorry, (.+) claimed/)?.[1];

        return (
          <ScanLayout
            {...shell}
            {...stats}
            title="سبقك غيرك!"
            badge={<FlagBadge />}
            pill="دوّر على قطعة ثانية بسرعة"
            actions={continueButton()}
          >
            <ScanNote
              strong={
                claimer ? (
                  <>
                    <bdi>{claimer}</bdi> سبقك لهذي القطعة
                  </>
                ) : (
                  "لاعب ثاني سبقك لهذي القطعة"
                )
              }
            >
              ما تغيّرت نقاطك. القطع الثانية لسّا تنتظرك!
            </ScanNote>
          </ScanLayout>
        );
      }

      case "freeze":
        return (
          <FreezeView
            shell={shell}
            currentScore={scanError.current_score}
            remainingTags={scanError.remaining_tags}
            frozenUntil={scanError.frozen_until}
            onContinue={goHome}
          />
        );

      case "skipped_tag": {
        const expected = scanError.message?.match(/\d+/)?.[0];
        const scanned =
          scanError.tag_sequence ?? (expected ? Number(expected) + 1 : null);

        return (
          <ScanLayout
            {...shell}
            {...stats}
            title="مو بالترتيب!"
            tone="mint"
            badge={<NumberBadge value={scanned ?? "؟"} />}
            pill={`امسح القطعة ${pad(expected ?? "؟")} أول`}
            actions={continueButton("كمّل اللعب")}
          >
            <ScanNote>
              لازم تمسح القطعة {pad(expected ?? "؟")} قبل هذي. في الوضع التسلسلي
              القطع تنفتح بالترتيب، ونقاطك ما تغيّرت.
            </ScanNote>
          </ScanLayout>
        );
      }

      case "not_live":
        return (
          <ScanLayout
            {...shell}
            showStats={false}
            title="استعد!"
            badge={<MarkBadge />}
            pill="الجولة ما بدأت أو انتهت"
            actions={homeButton}
          >
            <InfoCard
              title="ننتظر المنظّم يبدأ الجولة"
              text="صاحب اللعبة ما شغّلها أو وقّفها مؤقتًا. امسح القطعة مرة ثانية لما تشتغل."
            />
          </ScanLayout>
        );

      case "not_yours":
        return (
          <ScanLayout
            {...shell}
            showStats={false}
            title="مو رابطك!"
            badge={<LockBadge />}
            pill="هذا الرابط مو لك"
            actions={homeButton}
          >
            <InfoCard
              title="امسح القطعة بجوالك عشان تفتحها"
              text="الروابط ما تنتقل بين اللاعبين، كل مسح ينحسب لصاحبه."
            />
          </ScanLayout>
        );

      case "completed":
        return (
          <ScanLayout
            {...shell}
            showStats={false}
            title="خلصتها!"
            badge={<CupBadge />}
            pill="ما تقدر تمسح قطع جديدة"
            actions={homeButton}
          >
            <ScanNote strong="أنت خلصت هذي الجولة من قبل">
              ما فيه قطع جديدة تمسحها في هذي الجولة.
            </ScanNote>
          </ScanLayout>
        );

      default:
        return (
          <ScanLayout
            {...shell}
            showStats={false}
            title="ما ضبطت!"
            badge={<LockBadge />}
            pill="تعذّر قراءة القطعة"
            actions={homeButton}
          >
            <InfoCard
              title={scanError.message || "تعذر قراءة البطاقة."}
              text="جرّب تمسح القطعة مرة ثانية."
            />
          </ScanLayout>
        );
    }
  }

  if (!scanResult) {
    return (
      <ScanLayout
        {...shell}
        showStats={false}
        title="ما فيه شي"
        badge={<MarkBadge />}
        pill="لا توجد بيانات لعرضها"
        actions={homeButton}
      />
    );
  }

  // ---------- نتيجة المسح ----------
  const content = scanResult.content;
  const score = scanResult.current_score ?? 0;
  const remaining = scanResult.remaining_tags ?? 0;
  const tagNumber = scanResult.tag_sequence;
  const stats = { score, remaining };

  // الجولة انتهت والقطعة للعرض فقط
  if (scanResult.status === "view_only") {
    return (
      <ScanLayout
        {...shell}
        statusChip="انتهت الجولة"
        title="انتهت الجولة"
        tone="mint"
        badge={<NumberBadge value={tagNumber} />}
        pill="للعرض فقط · ما تنحسب نقاط"
        score={score}
        actions={
          <>
            <Button onClick={openBoard}>شوف المتصدرين</Button>
            <Button variant="outline" onClick={goHome}>
              ارجع للرئيسية
            </Button>
          </>
        }
      >
        <HintCard text={content?.hint} image={content?.image} />
        {scanResult.tag_type === "trap" && (
          <ScanNote>هذه قطعة فخ. ما راح ينطبق أي تأثير.</ScanNote>
        )}
      </ScanLayout>
    );
  }

  if (scanResult.tag_type === "trap") {
    // اللاعب زرع الفخ للتو
    if (scanResult.status === "trap_set" && content?.was_choose) {
      const isBoom = Boolean(content.boom);

      return (
        <ScanLayout
          {...shell}
          {...stats}
          title="زرعته!"
          badge={isBoom ? <BombBadge /> : <FreezeBadge />}
          pill={
            isBoom
              ? `فخ بووم على القطعة ${pad(tagNumber)}`
              : `فخ تجميد ${content.freeze} ث على القطعة ${pad(tagNumber)}`
          }
          actions={continueButton()}
        >
          <InfoCard
            title={
              isBoom
                ? "أول واحد يمسحها بعدك يخسر نقطة"
                : "أول واحد يمسحها بعدك يتجمّد"
            }
            text="كمّل، وخلّه يتفاجأ."
          />
        </ScanLayout>
      );
    }

    if (content?.choose) {
      return (
        <ChooseTrap
          key={`${tagHash}:${userHash}:${accessToken}`}
          shell={shell}
          tagHash={tagHash}
          userHash={userHash}
          accessToken={accessToken}
          currentScore={score}
          remainingTags={remaining}
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
    }

    if (content?.boom) {
      return (
        <ScanLayout
          {...shell}
          {...stats}
          title="بووم!"
          badge={<BombBadge value={`−${content.boom}`} />}
          pill={`خسرت نقطة · صارت نقاطك ${score}`}
          actions={continueButton()}
        >
          <InfoCard
            label="تفاصيل الخصم"
            title={`نقاطك الآن ${score}`}
            text="النقاط ما تنزل تحت الصفر"
            aside={`−${content.boom}`}
          />
        </ScanLayout>
      );
    }

    if (content?.freeze) {
      return (
        <FreezeView
          shell={shell}
          currentScore={score}
          remainingTags={remaining}
          frozenUntil={scanResult.frozen_until}
          freezeSeconds={content.freeze}
          onContinue={goHome}
        />
      );
    }

    return (
      <ScanLayout
        {...shell}
        {...stats}
        title="قطعة فخ"
        badge={<NumberBadge value={tagNumber} />}
        pill="الفخ فاضي"
        actions={continueButton()}
      />
    );
  }

  // جمع كل القطع
  if (scanResult.event_finished) {
    const total = score + remaining;

    return (
      <ScanLayout
        {...shell}
        statusChip="انتهت الجولة"
        title="خلصتها!"
        badge={<CupBadge count={`${score}/${total}`} />}
        pill="ما تقدر تمسح قطع جديدة"
        score={score}
        remaining={remaining}
        actions={
          <>
            <Button onClick={openBoard}>شوف المتصدرين</Button>
            <Button variant="outline" onClick={goHome}>
              ارجع للرئيسية
            </Button>
          </>
        }
      >
        <ScanNote strong="ألف مبروووك! لقيت كل القطع">
          الآن خلصت الجولة، شوف ترتيبك في المتصدرين.
        </ScanNote>
      </ScanLayout>
    );
  }

  // حصلتها
  return (
    <ScanLayout
      {...shell}
      {...stats}
      title="حصلتها!"
      badge={<NumberBadge value={tagNumber} />}
      pill={
        scanResult.mode === "open"
          ? `القطعة ${pad(tagNumber)} صارت لك`
          : `القطعة ${score} من ${score + remaining}`
      }
      actions={continueButton()}
    >
      <HintCard text={content?.hint} image={content?.image} />
    </ScanLayout>
  );
}
