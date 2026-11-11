import { useState, useEffect } from "react";
import { loginUser } from "../../api/auth/authApi";
import { getCurrentUser } from "../../api/users/usersApi";
import { useAuth } from "../../context/AuthContext";
import AuthLayout from "../../components/layout/AuthLayout";
import AuthPromo from "../../components/layout/AuthPromo";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import LoginForm from "../../components/auth/LoginForm";
import DehmScan from "../../components/ui/DehmScan";
import { takeClaimReturn } from "../../utils/claimReturn";
import Button from "../../components/ui/Button";

export default function LoginPage() {
  const { signIn, user, accessToken, isRestoring } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchParams] = useSearchParams();
  const redirectTag = searchParams.get("redirect_tag");
  const redirectSig = searchParams.get("redirect_sig");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState(
    location.state?.passwordReset
      ? "تم تغيير كلمة المرور. ادخل بكلمة المرور الجديدة."
      : "",
  );
  const [showForm, setShowForm] = useState(!redirectTag);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (!isRestoring && accessToken && user) {
      if (redirectTag) {
        const hashToUse = redirectSig || user.user_hash;
        navigate(
          `/scan?${new URLSearchParams({
            tag: redirectTag,
            sig: hashToUse,
          }).toString()}`,
          { replace: true },
        );
      } else {
        navigate("/home", { replace: true });
      }
    }
  }, [isRestoring, accessToken, user, redirectTag, redirectSig, navigate]);

  async function handleLogin(credentials) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setServerError("");
    setNotice("");

    try {
      const result = await loginUser(credentials);
      if (
        typeof result.access_token !== "string" ||
        !result.access_token.trim()
      ) {
        throw new Error("Missing access token");
      }

      const userData = await getCurrentUser(result.access_token);
      signIn(result.access_token, userData);

      const returnTo = takeClaimReturn();

      if (redirectTag) {
        const hashToUse = redirectSig || userData.user_hash;

        navigate(
          `/scan?${new URLSearchParams({
            tag: redirectTag,
            sig: hashToUse,
          }).toString()}`,
          { replace: true },
        );
      } else if (returnTo) {
        navigate(returnTo, { replace: true });
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
        {!showForm && redirectTag ? (
          <div dir="rtl" className="check-login">
            <h1>سجّل دخولك عشان تكمّل</h1>
            <p>بعد الدخول نرجعك لنفس القطعة ونحسبها لك</p>

            <Button
              variant="primary"
              fullWidth
              onClick={() => setShowForm(true)}
            >
              سجّل الدخول
            </Button>

            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                const params = new URLSearchParams({
                  redirect_tag: redirectTag,
                });
                if (redirectSig) params.set("redirect_sig", redirectSig);
                navigate(`/register?${params.toString()}`);
              }}
            >
              أنشئ حساب جديد
            </Button>
          </div>
        ) : (
          <LoginForm
            onLogin={handleLogin}
            isSubmitting={isSubmitting}
            serverError={serverError}
            notice={notice}
            onEdit={() => setServerError("")}
          />
        )}
      </div>
    </AuthLayout>
  );
}
