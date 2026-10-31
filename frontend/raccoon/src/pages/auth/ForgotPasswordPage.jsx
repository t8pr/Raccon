// Forgot password logic: send the reset link, then show "check your email"
import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../../api/auth/authApi";
import AuthLayout from "../../components/layout/AuthLayout";
import AuthPromo from "../../components/layout/AuthPromo";
import ForgotPasswordForm from "../../components/auth/ForgotPasswordForm";
import AuthStatus from "../../components/auth/AuthStatus";
import Button from "../../components/ui/Button";
import DehmScan from "../../components/ui/DehmScan";

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [sentTo, setSentTo] = useState(""); // email after a successful request

  async function handleRequest(email) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setServerError("");

    try {
      await requestPasswordReset(email);
      // The server answers the same for every email, so we never say
      // whether an account exists.
      setSentTo(email);
    } catch (error) {
      if (error.status === 422) {
        setServerError("أدخل بريدًا إلكترونيًا صحيحًا.");
      } else {
        setServerError("تعذر إرسال الرابط. حاول مرة ثانية.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      showTabs={false}
      promo={
        <AuthPromo
          scene={<DehmScan />}
          mobileTitle={sentTo ? "شيّك على بريدك" : "نسيت كلمة المرور؟"}
          mobileSubTitle={
            sentTo ? "" : "بنرسل لك رابط تعيّن فيه كلمة مرور جديدة."
          }
          variant="login"
        />
      }
    >
      <div className="login-page">
        {sentTo ? (
          <AuthStatus
            tone="info"
            title="شيّك على بريدك"
            text={`إذا كان فيه حساب مسجّل بـ ${sentTo}، بيوصلك رابط إعادة تعيين كلمة المرور خلال دقائق. الرابط صالح لمدة 15 دقيقة ويشتغل مرة وحدة بس.`}
          >
            <p className="auth-status__hint">
              ما وصلك شي؟ شيّك على الرسائل غير المرغوبة، أو أرسل الرابط مرة ثانية.
            </p>

            <Button
              variant="secondary"
              fullWidth
              loading={isSubmitting}
              onClick={() => handleRequest(sentTo)}
            >
              أرسل الرابط مرة ثانية
            </Button>

            <Link className="auth-status__link" to="/login">
              ارجع لتسجيل الدخول
            </Link>
          </AuthStatus>
        ) : (
          <ForgotPasswordForm
            onSubmit={handleRequest}
            isSubmitting={isSubmitting}
            serverError={serverError}
            onEdit={() => setServerError("")}
          />
        )}
      </div>
    </AuthLayout>
  );
}
