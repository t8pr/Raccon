import { useState } from "react";

import AuthLayout from "../../components/layout/AuthLayout";
import AuthPromo from "../../components/layout/AuthPromo";
import DehmScan from "../../components/ui/DehmScan";
import RegisterForm from "../../components/auth/RegisterForm";

import { registerUser, loginUser } from "../../api/auth/authApi";
import { getCurrentUser } from "../../api/users/usersApi";
import { useAuth } from "../../context/AuthContext";
import RegisterWelcome from "../../components/auth/RegisterWelcome";

export default function RegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false); // is the submitting is load

  const [serverError, setServerError] = useState(""); // backend error
  const [fieldErrors, setFieldErrors] = useState({}); // check the logic of auth(name/email/password/..) in backend
  const [successMessage, setSuccessMessage] = useState(""); // message register success
  const { signIn } = useAuth();

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
      promo={<AuthPromo scene={<DehmScan />} mobileTitle="أنشى حسابك" />}
    >
      <RegisterForm
        onRegister={handleRegister}
        isSubmitting={isSubmitting}
        serverError={serverError}
        fieldErrors={fieldErrors}
        successMessage={successMessage}
        onEdit={handleEdit}
      />
    </AuthLayout>
  );
}
