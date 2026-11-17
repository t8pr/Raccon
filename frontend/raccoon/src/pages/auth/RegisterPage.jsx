import { useState } from "react";

import AuthLayout from "../../components/layout/AuthLayout";
import AuthPromo from "../../components/layout/AuthPromo";
import HeroScanAnimation from "../../components/ui/HeroScanAnimation";
import FoundHero from "../../components/ui/FoundHero";
import RegisterForm from "../../components/auth/RegisterForm";

import { registerUser, loginUser, googleLogin } from "../../api/auth/authApi";
import { getCurrentUser } from "../../api/users/usersApi";
import { useAuth } from "../../context/AuthContext";
import RegisterWelcome from "../../components/auth/RegisterWelcome";
import { useNavigate, useSearchParams } from "react-router-dom";
import { takeClaimReturn } from "../../utils/claimReturn";

export default function RegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false); // is the submitting is load

  const [serverError, setServerError] = useState(""); // backend error
  const [fieldErrors, setFieldErrors] = useState({}); // check the logic of auth(name/email/password/..) in backend
  const [successMessage, setSuccessMessage] = useState(""); // message register success
  const { signIn } = useAuth();
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

        const profile = await getCurrentUser(result.access_token);

        signIn(result.access_token, profile);
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

      const profile = await getCurrentUser(result.access_token);
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
    }
  }

  function handleEdit() {
    setServerError("");
    setFieldErrors({});
    setSuccessMessage("");
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
            redirectTag ? "" : "أنشئ حسابك وابدأ أول رحلة بحث"
          }
        />
      }
    >
      <RegisterForm
        onRegister={handleRegister}
        isSubmitting={isSubmitting}
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
