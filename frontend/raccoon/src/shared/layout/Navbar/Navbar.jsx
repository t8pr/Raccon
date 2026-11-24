import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Navbar.css";

// title: إذا وُجد يظهر مكان روابط التنقل (مثل اسم الجولة في شاشات المسح)
// الاتجاه يجي من <html dir> حسب اللغة
export default function Navbar({ logo, items = [], account, title }) {
  const { t } = useTranslation();

  return (
    <header className={`rac-navbar${title ? " rac-navbar--titled" : ""}`}>
      <Link
        to="/home"
        className="rac-navbar__brand"
        aria-label={t("nav.brandLabel")}
      >
        <img src={logo} alt="" />
      </Link>

      {title ? (
        <p className="rac-navbar__title">{title}</p>
      ) : (
        <nav className="rac-navbar__links" aria-label={t("nav.mainNav")}>
          {items.map((item) =>
            item.disabled ? (
              <span
                key={item.to}
                className="rac-navbar__link rac-navbar__link--disabled"
                aria-disabled="true"
                title={t("nav.soon")}
              >
                {item.label}
              </span>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rac-navbar__link ${isActive ? "rac-navbar__link--active" : ""}`
                }
              >
                {item.label}
              </NavLink>
            ),
          )}
        </nav>
      )}

      <div className="rac-navbar__account">{account}</div>
    </header>
  );
}
