import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  Globe,
  Nfc,
  Flag,
  Check,
  Lock,
  Trophy,
  Sparkles,
  RotateCcw,
  Smartphone,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../shared/auth/AuthContext";
import AppNavbar from "../../shared/layout/AppNavbar/AppNavbar";
import Navbar from "../../shared/layout/Navbar/Navbar";
import NfcCoil from "../../shared/ui/NfcCoil/NfcCoil";
import Mark from "../../assets/Mark.png";
import Dehem from "../../assets/avatars/Dehem.png";
import Mento from "../../assets/avatars/Mento.png";
import Sakhr from "../../assets/avatars/Sakhr.png";
import Ghamda from "../../assets/avatars/Ghamda.png";
import "./LandingPage.css";

const TRAPS = [
  {
    id: "boom",
    img: "/boom-hero.svg",
    title: "landing.traps.boomTitle",
    desc: "landing.traps.boomDesc",
  },
  {
    id: "freeze",
    img: "/freeze-hero.svg",
    title: "landing.traps.freezeTitle",
    desc: "landing.traps.freezeDesc",
  },
  {
    id: "choose",
    img: "/choose-trap-hero.svg",
    title: "landing.traps.chooseTitle",
    desc: "landing.traps.chooseDesc",
  },
];

const SQUAD = [
  { id: "dehem", name: "Dehem", avatar: Dehem, tag: "landing.squad.dehemTag" },
  { id: "mento", name: "Mento", avatar: Mento, tag: "landing.squad.mentoTag" },
  { id: "sakhr", name: "Sakhr", avatar: Sakhr, tag: "landing.squad.sakhrTag" },
  { id: "ghamda", name: "Ghamda", avatar: Ghamda, tag: "landing.squad.ghamdaTag" },
];

const OPEN_MAP_PINS = [
  { id: "p1", x: 18, y: 24, type: "point", delta: 1, label: "+1" },
  { id: "p2", x: 74, y: 20, type: "boom", delta: -1, label: "-1", img: "/boom-hero.svg" },
  { id: "p3", x: 48, y: 50, type: "point", delta: 1, label: "+1" },
  { id: "p4", x: 22, y: 74, type: "freeze", delta: 0, label: "10s", img: "/freeze-hero.svg" },
  { id: "p5", x: 78, y: 72, type: "point", delta: 1, label: "+1" },
];

const OCCASIONS = [
  { title: "landing.occasions.item1Title", desc: "landing.occasions.item1Desc" },
  { title: "landing.occasions.item2Title", desc: "landing.occasions.item2Desc" },
  { title: "landing.occasions.item3Title", desc: "landing.occasions.item3Desc" },
  { title: "landing.occasions.item4Title", desc: "landing.occasions.item4Desc" },
];

const INITIAL_SCORES = {
  mento: 11,
  dehem: 10,
  sakhr: 9,
  ghamda: 8,
};

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const { accessToken } = useAuth();

  const [selectedMode, setSelectedMode] = useState("open");
  const [scannedPins, setScannedPins] = useState(["p1"]);
  const [selectedTrap, setSelectedTrap] = useState("boom");
  const [selectedHeroId, setSelectedHeroId] = useState("dehem");
  const [scores, setScores] = useState(INITIAL_SCORES);
  const [justScanned, setJustScanned] = useState(false);

  const isArabic = (i18n.resolvedLanguage || "ar") === "ar";
  const toggleLanguage = () => i18n.changeLanguage(isArabic ? "en" : "ar");

  const activeTrap = TRAPS.find((tr) => tr.id === selectedTrap) || TRAPS[0];
  const guestNavItems = [{ label: t("landing.nav.store"), to: "/store" }];

  const openMapScore = scannedPins.reduce((sum, pinId) => {
    const pin = OPEN_MAP_PINS.find((p) => p.id === pinId);
    return sum + (pin ? pin.delta : 0);
  }, 0);

  function handlePinTap(pinId) {
    if (scannedPins.includes(pinId)) return;
    setScannedPins((prev) => [...prev, pinId]);
  }

  function handleResetMap() {
    setScannedPins([]);
  }

  const sortedPlayers = [...SQUAD]
    .map((member) => ({ ...member, pts: scores[member.id] ?? 0 }))
    .sort((a, b) => b.pts - a.pts);

  function handleDemoScan() {
    setScores((prev) => ({
      ...prev,
      [selectedHeroId]: (prev[selectedHeroId] ?? 0) + 1,
    }));
    setJustScanned(true);
    setTimeout(() => setJustScanned(false), 550);
  }

  return (
    <div className="rc-trail-shell">
      {accessToken ? (
        <AppNavbar />
      ) : (
        <Navbar
          logo={Mark}
          items={guestNavItems}
          account={
            <div className="rc-trail__guest-actions">
              <button
                type="button"
                className="rc-trail__lang-btn"
                onClick={toggleLanguage}
                aria-label="Switch language"
              >
                <Globe size={15} aria-hidden="true" />
                <span>{isArabic ? "EN" : "عربي"}</span>
              </button>
              <Link to="/login" className="rc-trail__nav-login">
                {t("landing.nav.login")}
              </Link>
              <Link to="/register" className="rc-trail__nav-register">
                {t("landing.nav.register")}
              </Link>
            </div>
          }
        />
      )}

      <main className="rc-trail">
        <section className="rc-trail__hero" aria-labelledby="landing-hero-title">
          <div className="rc-trail__hero-card">
            <div className="rc-trail__hero-copy">
              <h1 id="landing-hero-title" className="rc-trail__title">
                {t("landing.hero.titleLine1")}
                <span>{t("landing.hero.titleLine2")}</span>
              </h1>

              <p className="rc-trail__lead">{t("landing.hero.lead")}</p>

              <div className="rc-trail__hero-actions">
                <Link to="/store" className="rc-trail__btn-primary">
                  {t("landing.hero.primaryCta")}
                  <ChevronLeft size={18} aria-hidden="true" />
                </Link>
                {!accessToken && (
                  <Link to="/register" className="rc-trail__btn-outline">
                    {t("landing.hero.secondaryCta")}
                  </Link>
                )}
              </div>
            </div>

            <div className="rc-trail__hero-stage" aria-hidden="true">
              <div className="rc-trail__stage-coil">
                <NfcCoil />
              </div>
              <img src={Dehem} alt="" className="rc-trail__squad rc-trail__squad--1" />
              <img src={Mento} alt="" className="rc-trail__squad rc-trail__squad--2" />
              <img src={Sakhr} alt="" className="rc-trail__squad rc-trail__squad--3" />
              <img src={Ghamda} alt="" className="rc-trail__squad rc-trail__squad--4" />
            </div>
          </div>

          <div className="rc-trail__connector" aria-hidden="true">
            <span className="rc-trail__connector-line" />
            <div className="rc-trail__start-flag">
              <Flag size={15} />
              <span>{t("landing.steps.eyebrow")}</span>
            </div>
            <span className="rc-trail__connector-line" />
          </div>
        </section>

        <div className="rc-trail__board">
          <section className="rc-trail__bend rc-trail__bend--end" aria-labelledby="stop-1">
            <span className="rc-trail__node" aria-hidden="true">
              01
            </span>

            <div className="rc-trail__grid">
              <div className="rc-trail__copy">
                <span className="rc-trail__kicker">{t("landing.modes.eyebrow")}</span>
                <h2 id="stop-1">{t("landing.steps.step1Title")}</h2>
                <p>{t("landing.steps.step1Desc")}</p>

                <div
                  className="rc-trail__mode-toggle"
                  role="tablist"
                  aria-label={t("landing.modes.eyebrow")}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedMode === "open"}
                    className={`rc-trail__tab ${selectedMode === "open" ? "is-active is-open" : ""}`}
                    onClick={() => setSelectedMode("open")}
                  >
                    {t("landing.modes.openTag")}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedMode === "sequential"}
                    className={`rc-trail__tab ${selectedMode === "sequential" ? "is-active is-seq" : ""}`}
                    onClick={() => setSelectedMode("sequential")}
                  >
                    {t("landing.modes.seqTag")}
                  </button>
                </div>

                <div className={`rc-trail__mode-note rc-trail__mode-note--${selectedMode}`}>
                  <strong>
                    {selectedMode === "sequential"
                      ? t("landing.modes.seqTitle")
                      : t("landing.modes.openTitle")}
                  </strong>
                  <p>
                    {selectedMode === "sequential"
                      ? t("landing.modes.seqDesc")
                      : t("landing.modes.openDesc")}
                  </p>
                </div>
              </div>

              <div className="rc-trail__visual">
                <div className="rc-trail__mode-board">
                  <div className="rc-trail__mode-board-head">
                    <div className="rc-trail__mode-board-title">
                      <span className={`rc-trail__mode-dot is-${selectedMode}`} />
                      <span>
                        {selectedMode === "sequential"
                          ? t("landing.modes.seqTag")
                          : t("landing.modes.openTag")}
                      </span>
                    </div>

                    {selectedMode === "open" && (
                      <div className="rc-trail__map-hud">
                        <span className="rc-trail__map-score">
                          {t("landing.modes.openPoints")}:{" "}
                          <strong dir="ltr">{Math.max(0, openMapScore)}</strong>
                        </span>
                        <button
                          type="button"
                          className="rc-trail__map-reset"
                          onClick={handleResetMap}
                          aria-label={t("landing.modes.openReset")}
                        >
                          <RotateCcw size={13} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedMode === "sequential" ? (
                    <div className="rc-trail__seq-demo" aria-hidden="true">
                      <div className="rc-trail__seq-step is-done">
                        <span className="rc-trail__seq-icon">
                          <Check size={16} />
                        </span>
                        <span>Tag #1</span>
                      </div>
                      <span className="rc-trail__seq-line is-done" />
                      <div className="rc-trail__seq-step is-current">
                        <span className="rc-trail__seq-icon">
                          <Nfc size={16} />
                        </span>
                        <span>Tag #2</span>
                      </div>
                      <span className="rc-trail__seq-line" />
                      <div className="rc-trail__seq-step is-locked">
                        <span className="rc-trail__seq-icon">
                          <Lock size={15} />
                        </span>
                        <span>Tag #3</span>
                      </div>
                      <span className="rc-trail__seq-line" />
                      <div className="rc-trail__seq-step is-trophy">
                        <span className="rc-trail__seq-icon">
                          <Trophy size={16} />
                        </span>
                        <span>{isArabic ? "الكنز" : "Finish"}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="rc-trail__open-map-wrap">
                      <div className="rc-trail__open-map">
                        <span className="rc-trail__radar-ring rc-trail__radar-ring--1" aria-hidden="true" />
                        <span className="rc-trail__radar-ring rc-trail__radar-ring--2" aria-hidden="true" />

                        {OPEN_MAP_PINS.map((pin) => {
                          const isScanned = scannedPins.includes(pin.id);
                          return (
                            <button
                              key={pin.id}
                              type="button"
                              onClick={() => handlePinTap(pin.id)}
                              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                              className={`rc-trail__map-pin ${
                                isScanned ? `is-scanned is-${pin.type}` : ""
                              }`}
                              aria-label={isScanned ? pin.label : "Scan NFC tag"}
                            >
                              {!isScanned ? (
                                <Nfc size={18} aria-hidden="true" />
                              ) : pin.img ? (
                                <img src={pin.img} alt="" className="rc-trail__pin-svg" />
                              ) : (
                                <span dir="ltr">{pin.label}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <p className="rc-trail__map-caption">{t("landing.modes.openMapHint")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rc-trail__bend rc-trail__bend--start" aria-labelledby="stop-2">
            <span className="rc-trail__node" aria-hidden="true">
              02
            </span>

            <div className="rc-trail__grid rc-trail__grid--reverse">
              <div className="rc-trail__visual">
                <div className="rc-trail__trap-stage">
                  <div className="rc-trail__trap-tabs" role="tablist">
                    {TRAPS.map((trap) => (
                      <button
                        key={trap.id}
                        type="button"
                        role="tab"
                        aria-selected={selectedTrap === trap.id}
                        className={`rc-trail__trap-pill ${selectedTrap === trap.id ? "is-active" : ""}`}
                        onClick={() => setSelectedTrap(trap.id)}
                      >
                        {t(trap.title)}
                      </button>
                    ))}
                  </div>

                  <div className="rc-trail__trap-preview">
                    <img
                      src={activeTrap.img}
                      alt=""
                      className="rc-trail__trap-art"
                      aria-hidden="true"
                    />
                    <h3>{t(activeTrap.title)}</h3>
                    <p>{t(activeTrap.desc)}</p>
                  </div>
                </div>
              </div>

              <div className="rc-trail__copy">
                <span className="rc-trail__kicker">{t("landing.traps.eyebrow")}</span>
                <h2 id="stop-2">{t("landing.steps.step2Title")}</h2>
                <p>{t("landing.steps.step2Desc")}</p>
                <p className="rc-trail__sub">{t("landing.traps.subtitle")}</p>
              </div>
            </div>
          </section>

          <section className="rc-trail__bend rc-trail__bend--end" aria-labelledby="stop-3">
            <span className="rc-trail__node" aria-hidden="true">
              03
            </span>

            <div className="rc-trail__grid">
              <div className="rc-trail__copy">
                <span className="rc-trail__kicker">{t("landing.squad.eyebrow")}</span>
                <h2 id="stop-3">{t("landing.steps.step3Title")}</h2>
                <p>{t("landing.steps.step3Desc")}</p>
                <p className="rc-trail__sub">{t("landing.squad.hint")}</p>
              </div>

              <div className="rc-trail__visual">
                <div className="rc-trail__squad-grid" role="radiogroup" aria-label={t("landing.squad.eyebrow")}>
                  {SQUAD.map((member) => {
                    const isSelected = selectedHeroId === member.id;
                    return (
                      <button
                        key={member.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setSelectedHeroId(member.id)}
                        className={`rc-trail__char-card ${isSelected ? "is-selected" : ""}`}
                      >
                        <img src={member.avatar} alt="" className="rc-trail__char-img" />
                        <strong>{member.name}</strong>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="rc-trail__bend rc-trail__bend--start" aria-labelledby="stop-4">
            <span className="rc-trail__node" aria-hidden="true">
              04
            </span>

            <div className="rc-trail__grid rc-trail__grid--reverse">
              <div className="rc-trail__visual">
                <div className="rc-trail__leaderboard">
                  <div className="rc-trail__lb-head">
                    <div className="rc-trail__lb-title">
                      <span className="rc-trail__live-dot" />
                      <span>{t("landing.traps.leaderboardTitle")}</span>
                    </div>
                    <button
                      type="button"
                      className="rc-trail__scan-demo-btn"
                      onClick={handleDemoScan}
                    >
                      <Sparkles size={14} aria-hidden="true" />
                      <span>
                        {isArabic ? "جرّب مسحة" : "Try Scan"}{" "}
                        <b dir="ltr">+1</b>
                      </span>
                    </button>
                  </div>

                  <ul className="rc-trail__lb-list">
                    {sortedPlayers.map((player, idx) => {
                      const isYou = player.id === selectedHeroId;
                      return (
                        <li
                          key={player.id}
                          className={`rc-trail__lb-row ${isYou ? "is-you" : ""} ${
                            isYou && justScanned ? "is-pulsing" : ""
                          }`}
                        >
                          <span className="rc-trail__lb-rank" dir="ltr">
                            #{idx + 1}
                          </span>
                          <img src={player.avatar} alt="" className="rc-trail__lb-avatar" />
                          <span className="rc-trail__lb-name">
                            {player.name}
                            {isYou && (
                              <em className="rc-trail__you-badge">
                                {isArabic ? "أنت" : "You"}
                              </em>
                            )}
                          </span>
                          <span className="rc-trail__lb-pts" dir="ltr">
                            {player.pts}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <div className="rc-trail__copy">
                <span className="rc-trail__kicker">{t("landing.traps.leaderboardTitle")}</span>
                <h2 id="stop-4">{t("landing.steps.step4Title")}</h2>
                <p>{t("landing.steps.step4Desc")}</p>
                <p className="rc-trail__sub">{t("landing.traps.leaderboardDesc")}</p>
              </div>
            </div>
          </section>

          <section className="rc-trail__bend rc-trail__bend--end" aria-labelledby="stop-5">
            <span className="rc-trail__node" aria-hidden="true">
              05
            </span>

            <div className="rc-trail__grid">
              <div className="rc-trail__copy">
                <span className="rc-trail__kicker">{t("landing.occasions.eyebrow")}</span>
                <h2 id="stop-5">{t("landing.steps.step5Title")}</h2>
                <p>{t("landing.steps.step5Desc")}</p>

                <div className="rc-trail__perks">
                  <span className="rc-trail__perk">
                    <Smartphone size={16} aria-hidden="true" />
                    {t("landing.occasions.noApp")}
                  </span>
                  <span className="rc-trail__perk">
                    <RefreshCw size={16} aria-hidden="true" />
                    {t("landing.occasions.reusable")}
                  </span>
                </div>
              </div>

              <div className="rc-trail__visual">
                <div className="rc-trail__occasions-grid">
                  {OCCASIONS.map((item) => (
                    <article key={item.title} className="rc-trail__occasion-card">
                      <h3>{t(item.title)}</h3>
                      <p>{t(item.desc)}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="rc-trail__finish" aria-labelledby="finish-title">
          <div className="rc-trail__finish-card">
            <h2 id="finish-title">{t("landing.cta.title")}</h2>
            <p>{t("landing.cta.desc")}</p>
            <Link
              to={accessToken ? "/home" : "/store"}
              className="rc-trail__btn-primary"
            >
              {accessToken ? t("landing.nav.dashboard") : t("landing.cta.button")}
              <ChevronLeft size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}