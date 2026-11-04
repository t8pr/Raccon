import { Link } from "react-router-dom";
import { ChevronLeft, Nfc } from "lucide-react";
import AppNavbar from "../../components/layout/AppNavbar";
import NfcCoil from "../../components/ui/NfcCoil";
import { useAuth } from "../../context/AuthContext";
import Dehem from "../../assets/avatars/Dehem.png";
import "../../styles/HomePage.css";

const homeContent = {
  user: {
    quick: {
      title: "تجربة الكشتة",
      text: "6 قطع بمسح متسلسل",
      action: "تعديل",
      to: "/customization",
    },
    feature: {
      title: "راكون للفعاليات",
      text: "تجارب تفاعلية جاهزة للمعارض والمهرجانات",
      action: "اطلب عرض سعر",
      to: "/store",
    },
    cards: [
      {
        title: "التجربة التسلسلية المنظمة",
        text: "كل قطعة تكشف سر التي تليها، في رحلة مشوقة تقودك لخط النهاية.",
        to: "/store",
      },
      {
        title: "استكشاف حر (الصيد المفتوح)",
        text: "جميع القطع متاحة في آن واحد؛ اكتشف بحرية واجمع النقاط لتتصدر القائمة.",
        to: "/store",
      },
    ],
  },
  admin: {
    quick: {
      title: "إنشاء تجربة جديدة",
      text: "اختر النوع وعدد القطع، ونجهّز روابط التفعيل والطباعة",
      action: "انشئ",
      to: "/admin/experiences/new",
    },
    feature: {
      title: "إدارة التجارب",
      text: "كل التجارب وحالة تفعيلها",
      action: "تصفح",
      to: "/admin/experiences",
    },
    cards: [
      {
        title: "إدارة المستخدمين والصلاحيات",
        text: "التحكم بحسابات المستخدمين، صلاحيات الوصول، ومتابعة سجل النشاطات.",
        to: "/admin/users",
      },
      {
        title: "لوحة المؤشرات والإحصائيات",
        text: "رصد مباشر لنسب التفاعل، عدد المسحات، وأداء المستخدمين.",
        to: "/admin/dashboard",
      },
    ],
  },
};

export default function HomePage() {
  const { user } = useAuth();
  const content = user?.role === "admin" ? homeContent.admin : homeContent.user;

  return (
    <div dir="rtl" className="rc-home-shell">
      <AppNavbar />

      <main className="rc-home">
        <section className="rc-home__bento" aria-labelledby="home-title">
          {/* Hero */}
          <article className="rc-home__hero">
            <div className="rc-home__copy">
              <h1 id="home-title" className="rc-home__title">
                حوّل أي مكان
                <span>إلى مغامرة تفاعلية</span>
              </h1>
              <p className="rc-home__lead">
                قطع NFC ذكية تأخذ الزوار في رحلة استكشافية خطوة بخطوة: ألغاز،
                تحديات، لوحة صدارة فورية، وتفاعل حي مع كل مسحة.
              </p>
              <Link to="/store" className="rc-home__cta">
                تصفح المتجر
                <ChevronLeft size={18} aria-hidden="true" />
              </Link>
            </div>

            <div className="rc-home__art" aria-hidden="true">
              <span className="rc-home__chip">
                حصلتها!
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
                <h2>{content.quick.title}</h2>
                <p>{content.quick.text}</p>
              </div>
              <Link to={content.quick.to} className="rc-home__pill">
                {content.quick.action}
                <ChevronLeft size={14} aria-hidden="true" />
              </Link>
            </article>

            <article className="rc-home__feature">
              <div>
                <h2>{content.feature.title}</h2>
                <p>{content.feature.text}</p>
              </div>
              <div className="rc-home__feature-row">
                <span className="rc-home__mini-tag" aria-hidden="true">
                  <NfcCoil line="var(--panel-raised)" chip="var(--panel-raised)" />
                </span>
                <Link to={content.feature.to} className="rc-home__pill">
                  {content.feature.action}
                  <ChevronLeft size={14} aria-hidden="true" />
                </Link>
              </div>
            </article>
          </div>
        </section>

        {/* Category / tool cards */}
        <section className="rc-home__cards" aria-label="اختصارات">
          {content.cards.map((card) => (
            <Link key={card.title} to={card.to} className="rc-home__card">
              <div className="rc-home__card-head">
                <h3>{card.title}</h3>
                <ChevronLeft size={22} aria-hidden="true" />
              </div>
              <p>{card.text}</p>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
