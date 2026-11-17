import { useState, useEffect } from "react";
import { loginUser, googleLogin } from "../../api/auth/authApi";
import { getCurrentUser } from "../../api/users/usersApi";
import { useAuth } from "../../context/AuthContext";
import AuthLayout from "../../components/layout/AuthLayout";
import AuthPromo from "../../components/layout/AuthPromo";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import LoginForm from "../../components/auth/LoginForm";
import HeroScanAnimation from "../../components/ui/HeroScanAnimation";
import FoundHero from "../../components/ui/FoundHero";
import { takeClaimReturn } from "../../utils/claimReturn";

export default function LoginPage() {
  const { signIn, user, accessToken, isRestoring } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchParams] = useSearchParams();
  const redirectTag = searchParams.get("redirect_tag");
  // ProtectedRoute sends a logged-out scan here as ?redirect_tag=...&redirect_sig=...
  const redirectSig = searchParams.get("redirect_sig");

  const [isSubmitting, setIsSubmitting] = useState(false);
  // shown once after a successful password reset (sent from ResetPasswordPage)
  const [notice, setNotice] = useState(
    location.state?.passwordReset
      ? "تم تغيير كلمة المرور. ادخل بكلمة المرور الجديدة."
      : "",
  );
  const [serverError, setServerError] = useState("");

  // One place decides where to go after sign-in: scan → saved claim link → home.
  // ScanPage reads ?tag=...&sig=...
  function goAfterSignIn(userData) {
    if (redirectTag) {
      navigate(
        `/scan?${new URLSearchParams({
          tag: redirectTag,
          sig: redirectSig || userData.user_hash,
        }).toString()}`,
        { replace: true },
      );
      return;
    }

    const returnTo = takeClaimReturn();
    navigate(returnTo || "/home", { replace: true });
  }

  // Already signed in (session restored) → leave the login page.
  useEffect(() => {
    if (!isRestoring && accessToken && user) {
      goAfterSignIn(user);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRestoring, accessToken, user]);

  // Shared by password login and Google: get a token, load the user, redirect.
  async function signInWith(requestToken, mapError) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setServerError("");
    setNotice("");

    try {
      const result = await requestToken();
      if (
        typeof result?.access_token !== "string" ||
        !result.access_token.trim()
      ) {
        throw new Error("Missing access token");
      }

      const userData = await getCurrentUser(result.access_token);
      signIn(result.access_token, userData);

      goAfterSignIn(userData);
    } catch (error) {
      setServerError(mapError(error ?? {}));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogin(credentials) {
    return signInWith(
      () => loginUser(credentials),
      (error) => {
        if (error?.status === 401 || error.status === 400) {
          return "اسم المستخدم/البريد أو كلمة المرور غير صحيحة.";
        }
        if (error?.status === 422) return "يرجى التأكد من البيانات المدخلة.";
        return "تعذر تسجيل الدخول. حاول مرة أخرى.";
      },
    );
  }

  function handleGoogle(credential) {
    return signInWith(
      () => googleLogin(credential),
      (error) =>
        error?.status === 400
          ? "تعذر التحقق من حساب Google. حاول مرة ثانية."
          : "تعذر الدخول باستخدام Google. حاول مرة ثانية.",
    );
  }

  if (isRestoring) return null;

  return (
    <AuthLayout
      promo={
        <AuthPromo
          // came from scanning a tag → حصلتها hero, came from the landing → animation
          scene={redirectTag ? <FoundHero /> : <HeroScanAnimation />}
          mobileTitle={redirectTag ? "حصلتها!" : "هلا بالكحيلان حياك الله من جديد"}
          mobileSubTitle={redirectTag ? "" : "ادخل حسابك وكمّل رحلاتك"}
          variant="login"
        />
      }
    >
      <div className="login-page">
        <LoginForm
          onLogin={handleLogin}
          isSubmitting={isSubmitting}
          serverError={serverError}
          notice={notice}
          onEdit={() => setServerError("")}
          onGoogle={handleGoogle}
          onGoogleError={() =>
            setServerError("ما اكتمل الدخول باستخدام Google. حاول مرة ثانية.")
          }
        />
      </div>
    </AuthLayout>
  );
}
