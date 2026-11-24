import { Link } from "react-router-dom";
import { ChevronLeft, Nfc } from "lucide-react";
import AppNavbar from "../../shared/layout/AppNavbar/AppNavbar";
import NfcCoil from "../../shared/ui/NfcCoil/NfcCoil";
import { useAuth } from "../../shared/auth/AuthContext";
import Dehem from "../../assets/avatars/Dehem.png";
import "./HomePage.css";
import { useTranslation } from "react-i18next";

// النصوص مفاتيح ترجمة، تنترجم وقت العرض
const homeContent = {
  user: {
    quick: {
      title: "home.user.quick.title",
      text: "home.user.quick.text",
      action: "home.user.quick.action",
      to: "/customization",
    },
    feature: {
      title: "home.user.feature.title",
      text: "home.user.feature.text",
      action: "home.user.feature.action",
      to: "/store",
    },
    cards: [
      {
        title: "home.user.card1.title",
        text: "home.user.card1.text",
        to: "/store",
      },
      {
        title: "home.user.card2.title",
        text: "home.user.card2.text",
        to: "/store",
      },
    ],
  },
  admin: {
    quick: {
      title: "home.admin.quick.title",
      text: "home.admin.quick.text",
      action: "home.admin.quick.action",
      to: "/admin/experiences/new",
    },
    feature: {
      title: "home.admin.feature.title",
      text: "home.admin.feature.text",
      action: "home.admin.feature.action",
      to: "/admin/experiences",
    },
    cards: [
      {
        title: "home.admin.card1.title",
        text: "home.admin.card1.text",
        to: "/admin/users",
      },
      {
        title: "home.admin.card2.title",
        text: "home.admin.card2.text",
        to: "/admin/dashboard",
      },
    ],
  },
};

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const content = user?.role === "admin" ? homeContent.admin : homeContent.user;

  return (
    <div className="rc-home-shell">
      <AppNavbar />

      <main className={`rc-home ${user?.role === "admin" ? "rc-home--admin" : ""}`}>
        <section className="rc-home__bento" aria-labelledby="home-title">
          {/* Hero */}
          <article className="rc-home__hero">
            <div className="rc-home__copy">
              <h1 id="home-title" className="rc-home__title">
                {t("home.hero.titleLine1")}
                <span>{t("home.hero.titleLine2")}</span>
              </h1>
              <p className="rc-home__lead">
                {t("home.hero.lead")}
              </p>
              <Link to="/store" className="rc-home__cta">
                {t("home.hero.cta")}
                <ChevronLeft size={18} aria-hidden="true" />
              </Link>
            </div>

            <div className="rc-home__art" aria-hidden="true">
              <span className="rc-home__chip">
                {t("auth.found.title")}
                <Nfc size={16} />
              </span>
              <div className="rc-home__tag">
                <NfcCoil />
              </div>
              <img className="rc-home__dehem" src={Dehem} alt="" />
            </div>
          </article>

          {/* Side cards */}
          <div className="rc-home__side">
            <article className="rc-home__quick">
              <div>
                <h2>{t(content.quick.title)}</h2>
                <p>{t(content.quick.text)}</p>
              </div>
              <Link to={content.quick.to} className="rc-home__pill">
                {t(content.quick.action)}
                <ChevronLeft size={14} aria-hidden="true" />
              </Link>
            </article>

            <article className="rc-home__feature">
              <div>
                <h2>{t(content.feature.title)}</h2>
                <p>{t(content.feature.text)}</p>
              </div>
              <div className="rc-home__feature-row">
                <span className="rc-home__mini-tag" aria-hidden="true">
                  <NfcCoil line="var(--panel-raised)" chip="var(--panel-raised)" />
                </span>
                <Link to={content.feature.to} className="rc-home__pill">
                  {t(content.feature.action)}
                  <ChevronLeft size={14} aria-hidden="true" />
                </Link>
              </div>
            </article>
          </div>
        </section>

        {/* Category / tool cards */}
        <section className="rc-home__cards" aria-label={t("home.shortcuts")}>
          {content.cards.map((card) => (
            <Link key={card.title} to={card.to} className="rc-home__card">
              <div className="rc-home__card-head">
                <h3>{t(card.title)}</h3>
                <ChevronLeft size={22} aria-hidden="true" />
              </div>
              <p>{t(card.text)}</p>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
