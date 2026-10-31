// this components for use it in register and login form
import AuthNavbar from "./AuthNavbar";
import AuthTabs from "../auth/AuthTabs";

export default function AuthLayout({ children, promo, variant = "default" }) {
  // children: here anything we put it inside a componenet like   <AuthLayout> <h1> hi </h1>  </AuthLayout> =====> h1 is children
  // promo: for the animation side of the register and login
  return (
    <div className={`auth-page auth-page--${variant}`}>
      <AuthNavbar />

      <main className="auth-layout">
        <section className="auth-layout__form">
          <div className="auth-layout__form-inner">
            <AuthTabs />
            {children}
            {/*right side*/}
          </div>
        </section>
        <aside className="auth-layout__promo">{promo}</aside> {/*right side*/}
      </main>
    </div>
  );
}
