// Forgot password: the user types the email of their account
import { useState } from "react";
import { Link } from "react-router-dom";
import AuthField from "../ui/AuthField";
import Button from "../ui/Button";
import InlineMessage from "../ui/InlineMessage";

// Validate Email (same rule as the login form)
export function validateEmail(value) {
  const email = value.trim();

  if (!email) {
    return "أدخل بريدك الإلكتروني.";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return "أدخل بريدًا إلكترونيًا صحيحًا.";
  }

  return "";
}

export default function ForgotPasswordForm({
  onSubmit,
  isSubmitting = false,
  serverError = "",
  onEdit,
}) {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  const emailError = validateEmail(email);

  function handleChange(event) {
    setEmail(event.target.value);

    if (onEdit) {
      onEdit();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    setTouched(true); // show the error if the user pressed Enter on an empty field

    if (emailError || isSubmitting) {
      return;
    }

    if (onSubmit) {
      onSubmit(email.trim());
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      {/* Header */}
      <div className="login-form__header">
        <h1 className="login-form__title">نسيت كلمة المرور؟</h1>

        <p className="login-form__subtitle">
          اكتب إيميلك المسجّل وبنرسل لك رابط تعيّن فيه كلمة مرور جديدة.
        </p>
      </div>

      <div className="login-form__error" aria-live="polite">
        {serverError && <InlineMessage type="error" message={serverError} />}
      </div>

      {/* Field */}
      <div className="login-form__fields">
        <AuthField
          label="البريد الإلكتروني"
          name="email"
          type="email"
          value={email}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          placeholder="name@example.com"
          error={touched ? emailError : ""}
          autoComplete="email"
          autoFocus
        />
      </div>

      {/* Submit */}
      <div className="login-form__submit">
        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={Boolean(emailError)}
          loading={isSubmitting}
        >
          أرسل الرابط
        </Button>
      </div>

      {/* Back to Login */}
      <div className="login-form__footer">
        <p>
          تذكرت كلمة المرور؟ <Link to="/login">ارجع لتسجيل الدخول</Link>
        </p>
      </div>
    </form>
  );
}
