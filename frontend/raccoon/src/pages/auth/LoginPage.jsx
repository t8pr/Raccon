//Login logic
import { useState } from "react";
import { loginUser } from "../../api/auth/authApi";
import { getCurrentUser } from "../../api/users/usersApi";
import { useAuth } from "../../context/AuthContext";
import AuthLayout from "../../components/layout/AuthLayout";
import AuthPromo from "../../components/layout/AuthPromo";
import { useNavigate, useLocation } from "react-router-dom";
import LoginForm from "../../components/auth/LoginForm";
import DehmScan from "../../components/ui/DehmScan";

export default function LoginPage() {
  const { signIn } = useAuth(); // userData from Authcontext
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // shown once after a successful password reset (sent from ResetPasswordPage)
  const [notice, setNotice] = useState(
    location.state?.passwordReset
      ? "تم تغيير كلمة المرور. ادخل بكلمة المرور الجديدة."
      : "",
  );
  const [serverError, setServerError] = useState("");

  //credentials: email/userName, password form (Login Form)
  async function handleLogin(credentials) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setServerError("");
    setNotice("");

    try {
      const result = await loginUser(credentials);
      //check for token available not empty string
      if (
        typeof result.access_token !== "string" ||
        !result.access_token.trim()
      ) {
        throw new Error("Missing access token");
      }

      const userData = await getCurrentUser(result.access_token);

      signIn(result.access_token, userData);
      navigate("/home", { replace: true });
    } catch (error) {
      if (error.status === 401 || error.status === 400) {
        setServerError("اسم المستخدم/البريد أو كلمة المرور غير صحيحة.");
      } else if (error.status === 422) {
        setServerError("يرجى التأكد من البيانات المدخلة.");
      } else {
        setServerError("تعذر تسجيل الدخول. حاول مرة أخرى.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      promo={
        <AuthPromo
          scene={<DehmScan />}
          mobileTitle="هلا بالكحيلان حياك الله من جديد"
          mobileSubTitle=""
          variant="login"
        />
      }
    >
      {/*Connect with the login-from*/}
      <div className="login-page">
        <LoginForm
          onLogin={handleLogin}
          isSubmitting={isSubmitting}
          serverError={serverError}
          notice={notice}
          onEdit={() => setServerError("")}
        />
      </div>
    </AuthLayout>
  );
}
