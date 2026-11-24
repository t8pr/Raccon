import { useState, useEffect, useRef } from "react";
import { loginUser, googleLogin } from "../../shared/api/authApi";
import { getCurrentUser } from "../../shared/api/usersApi";
import { useAuth } from "../../shared/auth/AuthContext";
import AuthLayout from "./components/AuthLayout/AuthLayout";
import AuthPromo from "./components/AuthPromo/AuthPromo";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import LoginForm from "./components/LoginForm/LoginForm";
import HeroScanAnimation from "./components/HeroScanAnimation";
import FoundHero from "./components/FoundHero/FoundHero";
import { takeClaimReturn } from "../../shared/utils/claimReturn";
import "./auth.css";
import { useTranslation } from "react-i18next";

export default function LoginPage() {
  const { t } = useTranslation();
  const { signIn, user, accessToken, isRestoring } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchParams] = useSearchParams();
  const redirectTag = searchParams.get("redirect_tag");
  // ProtectedRoute sends a logged-out scan here as ?redirect_tag=...&redirect_sig=...
  const redirectSig = searchParams.get("redirect_sig");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  // shown once after a successful password reset (sent from ResetPasswordPage)
  const [notice, setNotice] = useState(
    location.state?.passwordReset
      ? t("auth.login.passwordResetNotice")
      : "",
  );
  const [serverError, setServerError] = useState("");
  const redirectedRef = useRef(false);
  // One place decides where to go after sign-in: scan → saved claim link → home.
  // ScanPage reads ?tag=...&sig=...
  function goAfterSignIn(userData) {
    if (redirectedRef.current) return;
    redirectedRef.current = true;

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

      const userData = await getCurrentUser({ token: result.access_token });
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
          return t("auth.login.invalidCredentials");
        }
        if (error?.status === 422) return t("auth.login.checkInput");
        return t("auth.login.failed");
      },
    );
  }

  async function handleGoogle(credential) {
    if (isSubmitting) return;
    setIsGoogleSubmitting(true);
    try {
      await signInWith(
        () => googleLogin(credential),
        (error) =>
          error?.status === 400
            ? t("auth.google.verifyFailed")
            : t("auth.google.loginFailed"),
      );
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  if (isRestoring) return null;

  return (
    <AuthLayout
      promo={
        <AuthPromo
          // came from scanning a tag → حصلتها hero, came from the landing → animation
          scene={redirectTag ? <FoundHero /> : <HeroScanAnimation />}
          mobileTitle={
            redirectTag ? t("auth.found.title") : t("auth.login.mobileTitle")
          }
          mobileSubTitle={
            redirectTag
              ? t("auth.login.mobileSubtitleFound")
              : t("auth.login.mobileSubtitle")
          }
          variant="login"
        />
      }
    >
      <div className="login-page">
        <LoginForm
          onLogin={handleLogin}
          isSubmitting={isSubmitting}
          isGoogleSubmitting={isGoogleSubmitting}
          serverError={serverError}
          notice={notice}
          onEdit={() => setServerError("")}
          onGoogle={handleGoogle}
          onGoogleError={() =>
            setServerError(t("auth.google.loginIncomplete"))
          }
        />
      </div>
    </AuthLayout>
  );
}
