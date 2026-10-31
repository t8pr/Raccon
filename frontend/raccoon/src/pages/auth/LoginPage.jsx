import { useState, useEffect } from "react";
import { loginUser, getCurrentUser } from "../../api/authApi";
import { useAuth } from "../../context/AuthContext";
import AuthLayout from "../../components/layout/AuthLayout";
import AuthPromo from "../../components/layout/AuthPromo";
import { useNavigate, useSearchParams } from "react-router-dom";
import LoginForm from "../../components/auth/LoginForm";
import DehmScan from "../../components/ui/DehmScan";

export default function LoginPage() {
  const { signIn, user, accessToken, isRestoring } = useAuth();
  const navigate = useNavigate();
  
  const [searchParams] = useSearchParams();
  const redirectTag = searchParams.get("redirect_tag");
  const redirectUser = searchParams.get("redirect_user");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (!isRestoring && accessToken && user) {
      if (redirectTag) {
        const hashToUse = redirectUser ? redirectUser : user.user_hash;
        navigate(`/scan?tag=${redirectTag}&user=${hashToUse}`, { replace: true });
      } else {
        navigate("/home", { replace: true });
      }
    }
  }, [isRestoring, accessToken, user, redirectTag, redirectUser, navigate]);

  async function handleLogin(credentials) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setServerError("");

    try {
      const result = await loginUser(credentials);
      if (typeof result.access_token !== "string" || !result.access_token.trim()) {
        throw new Error("Missing access token");
      }
      
      const userData = await getCurrentUser(result.access_token);
      signIn(result.access_token, userData);

      if (redirectTag) {
        const hashToUse = redirectUser ? redirectUser : userData.user_hash;
        navigate(`/scan?tag=${redirectTag}&user=${hashToUse}`, { replace: true });
      } else {
        navigate("/home", { replace: true });
      }

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

  if (isRestoring) return null;

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
      <div className="login-page">
        <LoginForm
          onLogin={handleLogin}
          isSubmitting={isSubmitting}
          serverError={serverError}
          onEdit={() => setServerError("")}
        />
      </div>
    </AuthLayout>
  );
}