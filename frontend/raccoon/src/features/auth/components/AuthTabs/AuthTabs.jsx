import { NavLink, useSearchParams } from "react-router-dom";
import "./AuthTabs.css";
import { useTranslation } from "react-i18next";

export default function AuthTabs() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const redirectTag = searchParams.get("redirect_tag");
  const querySuffix = redirectTag ? `?redirect_tag=${redirectTag}` : "";

  return (
    <nav className="auth-tabs" aria-label="tabs">
      <NavLink
        to={`/register${querySuffix}`}
        className={({ isActive }) =>
          isActive
            ? "auth-tabs__link auth-tabs__link--active"
            : "auth-tabs__link"
        }
      >
        {t("auth.tabs.register")}
      </NavLink>
      <NavLink
        to={`/login${querySuffix}`}
        className={({ isActive }) =>
          isActive
            ? "auth-tabs__link auth-tabs__link--active"
            : "auth-tabs__link"
        }
      >
        {t("authNav.login")}
      </NavLink>
    </nav>
  );
}