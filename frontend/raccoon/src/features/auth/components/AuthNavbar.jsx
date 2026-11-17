import Mark from "../../../assets/Mark.png";
import "./AuthNavbar.css";

export default function AuthNavbar() {
  return (
    <header className="auth-navbar">
      <img src={Mark} alt="Raccon" className="auth-navbar__logo" />

      <span className="auth-navbar__help">مساعدة</span>
    </header>
  );
}
