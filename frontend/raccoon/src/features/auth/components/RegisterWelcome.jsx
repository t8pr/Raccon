import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CircleCheck } from "lucide-react";

import AuthNavbar from "./AuthNavbar";
import Button from "../../../shared/ui/Button";
import { avatarImages } from "../../../shared/constants/avatarImages";
import "./RegisterWelcome.css";

export default function RegisterWelcome({ name, avatarId, status }) {
  const navigate = useNavigate();

  const isReady = status === "ready";
  const hasError = status === "error";

  useEffect(() => {
    if (!isReady) return;

    const timer = setTimeout(() => {
      navigate("/home", { replace: true });
    }, 4000); // 4 second

    return () => clearTimeout(timer);
  }, [isReady, navigate]);

  return (
    <div className="register-welcome" dir="rtl">
      <AuthNavbar />

      <section
        className="register-welcome__body"
        aria-labelledby="welcome-title"
      >
        <div className="register-welcome__card">
          <img
            className="register-welcome__avatar"
            src={avatarImages[avatarId]}
            alt="شخصيتك المختارة"
          />

          <h1 id="welcome-title">
            هلا <bdi>{name}</bdi>!
          </h1>

          <p className="register-welcome__subtitle">حسابك جاهز</p>

          {hasError ? (
            <>
              <p role="alert">تم إنشاء حسابك، لكن تعذر الدخول تلقائيًا.</p>

              <Button
                fullWidth
                onClick={() => navigate("/login", { replace: true })}
              >
                تسجيل الدخول
              </Button>
            </>
          ) : (
            <Button fullWidth loading>
              {isReady ? "ثواني بس..." : "جارٍ تسجيل دخولك..."}
            </Button>
          )}

          <p className="register-welcome__hint">
            {hasError
              ? "ادخل باستخدام بيانات الحساب الذي أنشأته."
              : "نجهّز دخولك، وبعدها نودّيك للرئيسية."}
          </p>
        </div>
      </section>

      {isReady && (
        <div className="register-welcome__toast" role="status">
          <CircleCheck size={22} aria-hidden="true" />
          <span>خلاص، حسابك جاهز وأنت داخل</span>
        </div>
      )}
    </div>
  );
}
