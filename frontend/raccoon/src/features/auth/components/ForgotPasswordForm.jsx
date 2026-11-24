// Forgot password: the user types the email of their account
import { useState } from "react";
import { Link } from "react-router-dom";
import AuthField from "../../../shared/ui/AuthField/AuthField";
import Button from "../../../shared/ui/Button/Button";
import InlineMessage from "../../../shared/ui/InlineMessage/InlineMessage";
import "./LoginForm/LoginForm.css";
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";

// Validate Email (same rule as the login form)
export function validateEmail(value) {
  const email = value.trim();

  if (!email) {
    return i18n.t("validation.emailRequired");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return i18n.t("validation.emailInvalid");
  }

  return "";
}

export default function ForgotPasswordForm({
  onSubmit,
  isSubmitting = false,
  serverError = "",
  onEdit,
}) {
  const { t } = useTranslation();
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
        <h1 className="login-form__title">{t("auth.forgot.title")}</h1>

        <p className="login-form__subtitle">
          {t("auth.forgot.subtitle")}
        </p>
      </div>

      <div className="login-form__error" aria-live="polite">
        {serverError && <InlineMessage type="error" message={serverError} />}
      </div>

      {/* Field */}
      <div className="login-form__fields">
        <AuthField
          label={t("auth.fields.emailFull")}
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
          {t("auth.forgot.submit")}
        </Button>
      </div>

      {/* Back to Login */}
      <div className="login-form__footer">
        <p>
          {t("auth.forgot.remembered")}{" "}
          <Link to="/login">{t("auth.backToLogin")}</Link>
        </p>
      </div>
    </form>
  );
}
