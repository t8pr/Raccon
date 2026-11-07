import { NavLink, useSearchParams } from "react-router-dom";

export default function AuthTabs() {
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
        حساب جديد
      </NavLink>
      <NavLink
        to={`/login${querySuffix}`}
        className={({ isActive }) =>
          isActive
            ? "auth-tabs__link auth-tabs__link--active"
            : "auth-tabs__link"
        }
      >
        تسجيل الدخول
      </NavLink>
    </nav>
  );
}