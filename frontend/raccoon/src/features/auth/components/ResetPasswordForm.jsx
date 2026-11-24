// Reset password: new password + confirm (same rules as the register form)
import { useState } from "react";
import AuthField from "../../../shared/ui/AuthField/AuthField";
import Button from "../../../shared/ui/Button/Button";
import InlineMessage from "../../../shared/ui/InlineMessage/InlineMessage";
import "./LoginForm/LoginForm.css";
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";

export function validateNewPassword(values) {
  const errors = {};

  if (!values.password) {
    errors.password = i18n.t("auth.reset.newPasswordRequired");
  } else if (values.password.length < 8) {
    errors.password = i18n.t("validation.passwordMin");
  } else if (values.password.length > 72) {
    errors.password = i18n.t("auth.reset.passwordMax");
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = i18n.t("validation.confirmPasswordRequired");
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = i18n.t("validation.passwordsMismatch");
  }

  return errors;
}

export default function ResetPasswordForm({
  onSubmit,
  isSubmitting = false,
  serverError = "",
  onEdit,
}) {
  const { t } = useTranslation();
  const [values, setValues] = useState({ password: "", confirmPassword: "" });
  const [touched, setTouched] = useState({});

  const errors = validateNewPassword(values);
  const isFormValid = Object.keys(errors).length === 0;

  function handleChange(event) {
    const { name, value } = event.target;

    setValues((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (onEdit) {
      onEdit();
    }
  }

  function handleBlur(event) {
    const { name } = event.target;

    setTouched((previous) => ({
      ...previous,
      [name]: true,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setTouched({ password: true, confirmPassword: true });

    if (!isFormValid || isSubmitting) {
      return;
    }

    if (onSubmit) {
      onSubmit(values.password);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      {/* Header */}
      <div className="login-form__header">
        <h1 className="login-form__title">{t("auth.reset.title")}</h1>

        <p className="login-form__subtitle">
          {t("auth.reset.subtitle")}
        </p>
      </div>

      <div className="login-form__error" aria-live="polite">
        {serverError && <InlineMessage type="error" message={serverError} />}
      </div>

      {/* Fields */}
      <div className="login-form__fields">
        <AuthField
          label={t("auth.fields.newPassword")}
          name="password"
          type="password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={t("auth.fields.passwordPlaceholder")}
          error={touched.password ? errors.password || "" : ""}
          autoComplete="new-password"
          autoFocus
        />

        <AuthField
          label={t("auth.fields.confirmPassword")}
          name="confirmPassword"
          type="password"
          value={values.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={t("auth.fields.confirmPasswordPlaceholder")}
          error={touched.confirmPassword ? errors.confirmPassword || "" : ""}
          autoComplete="new-password"
        />
      </div>

      {/* Submit */}
      <div className="login-form__submit">
        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={!isFormValid}
          loading={isSubmitting}
        >
          {t("auth.reset.submit")}
        </Button>
      </div>
    </form>
  );
}
