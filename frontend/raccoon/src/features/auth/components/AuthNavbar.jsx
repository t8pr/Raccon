import { NavLink, useSearchParams } from "react-router-dom";
import Navbar from "../../../shared/layout/Navbar";
import Mark from "../../../assets/Mark.png";
import "./AuthNavbar.css";

// Login / register / password pages: same navbar as the app (logo → /home).
// The two pills are the ONLY login/register switch (no tabs, no footer links);
// the mint pill marks the current page. redirect_tag/redirect_sig are kept
// so a visitor who scanned a tag can switch pages without losing it.
export default function AuthNavbar() {
  const [searchParams] = useSearchParams();
  const keep = new URLSearchParams();
  ["redirect_tag", "redirect_sig"].forEach((key) => {
    const value = searchParams.get(key);
    if (value) keep.set(key, value);
  });
  const suffix = keep.toString() ? `?${keep.toString()}` : "";

  const pillClass = ({ isActive }) =>
    isActive ? "auth-pill auth-pill--active" : "auth-pill";

  const pills = (
    <nav className="auth-pills" aria-label="الدخول أو إنشاء حساب">
      <NavLink to={`/login${suffix}`} className={pillClass}>
        تسجيل الدخول
      </NavLink>
      <NavLink to={`/register${suffix}`} className={pillClass}>
        إنشاء حساب
      </NavLink>
    </nav>
  );

  return (
    <div className="auth-navbar">
      <Navbar logo={Mark} items={[]} account={pills} />
    </div>
  );
}
