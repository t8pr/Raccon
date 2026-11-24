import { useState } from "react";

import AuthLayout from "./components/AuthLayout";
import AuthPromo from "./components/AuthPromo";
import HeroScanAnimation from "./components/HeroScanAnimation";
import FoundHero from "./components/FoundHero";
import RegisterForm from "./components/RegisterForm";

import { registerUser, loginUser, googleLogin } from "../../shared/api/authApi";
import { getCurrentUser } from "../../shared/api/usersApi";
import { useAuth } from "../../shared/auth/AuthContext";
import RegisterWelcome from "./components/RegisterWelcome";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { takeClaimReturn } from "../../shared/utils/claimReturn";
import "./auth.css";

export default function RegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false); // is the submitting is load
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false); // busy request came from Google

  const [serverError, setServerError] = useState(""); // backend error
  const [fieldErrors, setFieldErrors] = useState({}); // check the logic of auth(name/email/password/..) in backend
  const [successMessage, setSuccessMessage] = useState(""); // message register success
  const { signIn, accessToken } = useAuth();
  // داخل من قبل (فيه توكن) لما فتح الصفحة → الرئيسية.
  // نقراه مرة وحدة عند الفتح بس، عشان الدخول اللي يصير هنا بعد التسجيل
  // ما يحوّله للرئيسية قبل شاشة الترحيب أو رابط claim.
  const [signedInOnArrival] = useState(Boolean(accessToken));
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTag = searchParams.get("redirect_tag");
  const redirectSig = searchParams.get("redirect_sig");

  const [registeredUser, setRegisteredUser] = useState(null);
  const [welcomeStatus, setWelcomeStatus] = useState("loading"); // after registeration success

  async function handleRegister(userData) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setServerError("");
    setFieldErrors({});
    setSuccessMessage("");

    try {
      await registerUser(userData);

      setWelcomeStatus("loading");

      setRegisteredUser({
        name: userData.name,
        avatarId: userData.avatar_id,
      });

      try {
        const result = await loginUser({
          identifier: userData.username,
          password: userData.password,
        });

        if (
          typeof result.access_token !== "string" ||
          !result.access_token.trim()
        ) {
          throw new Error("Missing access token");
        }

        const profile = await getCurrentUser({ token: result.access_token });

        signIn(result.access_token, profile);

        // جاي من مسح قطعة → صفحة المسح عشان تنحسب له القطعة (مثل Google)
        if (redirectTag) {
          navigate(
            `/scan?${new URLSearchParams({
              tag: redirectTag,
              sig: redirectSig || profile.user_hash,
            }).toString()}`,
            { replace: true },
          );
          return;
        }

        const returnTo = takeClaimReturn();

        if (returnTo) {
          navigate(returnTo, { replace: true });
          return;
        }
        setWelcomeStatus("ready");
      } catch {
        setWelcomeStatus("error");
      }
    } catch (error) {
      console.error("Register API Error:", {
        status: error.status,
        detail: error.detail,
        message: error.message,
      });
      if (error.status === 400) {
        setServerError("اسم المستخدم أو البريد الإلكتروني مستخدم مسبقًا");
      } else if (error.status === 422 && typeof error.detail === "string") {
        // the backend sends a plain string when the email can't be verified
        setFieldErrors({ email: "تعذر التحقق من البريد الإلكتروني." });
      } else if (error.status === 422) {
        const errors = {};

        if (Array.isArray(error.detail)) {
          for (const item of error.detail) {
            const field = item.loc?.[1];

            if (
              [
                "name",
                "username",
                "email",
                "phone_number",
                "password",
                "avatar_id",
              ].includes(field)
            ) {
              errors[field] = "تحقق من قيمة هذا الحقل";
            }
          }
        }

        setFieldErrors(errors);

        if (Object.keys(errors).length === 0) {
          setServerError("يرجى مراجعة البيانات المدخلة");
        }
      } else {
        setServerError("تعذر الاتصال بالخادم أو إكمال التسجيل. حاول مرة أخرى");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Google: the backend creates the account on first sign-in, then we redirect like login does.
  async function handleGoogle(credential) {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setIsGoogleSubmitting(true);
    setServerError("");
    setFieldErrors({});

    try {
      const result = await googleLogin(credential);
      if (
        typeof result.access_token !== "string" ||
        !result.access_token.trim()
      ) {
        throw new Error("Missing access token");
      }

      const profile = await getCurrentUser({ token: result.access_token });
      signIn(result.access_token, profile);

      const returnTo = takeClaimReturn();
      if (redirectTag) {
        navigate(
          `/scan?${new URLSearchParams({
            tag: redirectTag,
            sig: redirectSig || profile.user_hash,
          }).toString()}`,
          { replace: true },
        );
      } else if (returnTo) {
        navigate(returnTo, { replace: true });
      } else {
        navigate("/home", { replace: true });
      }
    } catch (error) {
      setServerError(
        error?.status === 400
          ? "تعذر التحقق من حساب Google. حاول مرة ثانية."
          : "تعذر التسجيل باستخدام Google. حاول مرة ثانية.",
      );
    } finally {
      setIsSubmitting(false);
      setIsGoogleSubmitting(false);
    }
  }

  function handleEdit() {
    setServerError("");
    setFieldErrors({});
    setSuccessMessage("");
  }

  if (signedInOnArrival) {
    return <Navigate to="/home" replace />;
  }

  //after register nav to welcome page before login
  if (registeredUser) {
    return (
      <RegisterWelcome
        name={registeredUser.name}
        avatarId={registeredUser.avatarId}
        status={welcomeStatus} // loding, error, ready
      />
    );
  }
  return (
    <AuthLayout
      variant="register"
      promo={
        <AuthPromo
          // came from scanning a tag → حصلتها hero, came from the landing → animation
          scene={redirectTag ? <FoundHero /> : <HeroScanAnimation />}
          mobileTitle={redirectTag ? "حصلتها!" : "أنشئ حسابك"}
          mobileSubTitle={
            redirectTag
              ? "أنشئ حساب جديد عشان تنحسب لك"
              : "أنشئ حسابك واصنع أول تجربة"
          }
        />
      }
    >
      <RegisterForm
        onRegister={handleRegister}
        isSubmitting={isSubmitting}
        isGoogleSubmitting={isGoogleSubmitting}
        serverError={serverError}
        fieldErrors={fieldErrors}
        successMessage={successMessage}
        onEdit={handleEdit}
        onGoogle={handleGoogle}
        onGoogleError={() =>
          setServerError("ما اكتمل التسجيل باستخدام Google. حاول مرة ثانية.")
        }
      />
    </AuthLayout>
  );
}
