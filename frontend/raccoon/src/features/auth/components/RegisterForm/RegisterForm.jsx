import { useState } from "react";
import AuthField from "../../../../shared/ui/AuthField/AuthField";
import Button from "../../../../shared/ui/Button/Button";
import InlineMessage from "../../../../shared/ui/InlineMessage/InlineMessage";
import GoogleAuthButton from "../GoogleAuthButton/GoogleAuthButton";
import AuthDivider from "../AuthDivider/AuthDivider";
import { registerSchema, validateForm } from "../../../../shared/utils/validation";
import "./RegisterForm.css";
import { useTranslation } from "react-i18next";

const initialValues = {
  name: "",
  username: "",
  email: "",
  phone_number: "",
  password: "",
  confirmPassword: "",
};

export default function RegisterForm({
  onRegister,
  isSubmitting = false,
  isGoogleSubmitting = false, // true only when the busy request came from Google
  serverError = "",
  fieldErrors = {}, // any field error from server
  successMessage = "",
  onEdit,
  onGoogle, // (credential) => void
  onGoogleError,
}) {
  const { t } = useTranslation();
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const validation = validateForm(registerSchema, values);
  const errors = validation.errors;
  const isFormValid = validation.success;

  // error massage under the field: touched error or fieldErrors from server
  function getFieldError(name) {
    if (touched[name] && errors[name]) {
      return errors[name];
    }

    return fieldErrors[name] || "";
  }

  // Update Input
  function handleChange(event) {
    const { name, value } = event.target;

    onEdit?.();

    setValues((previous) => ({
      ...previous,
      [name]: value,
    }));

    // show "passwords don't match" while typing, not only after leaving the field
    if (name === "confirmPassword") {
      setTouched((previous) => ({
        ...previous,
        confirmPassword: true,
      }));
    }
  }

  // Validate after leaving field
  function handleBlur(event) {
    const { name } = event.target;

    setTouched((previous) => ({
      ...previous,
      [name]: true,
    }));
  }

  // Submit Form
  function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;
    const result = validateForm(registerSchema, values);
    if (!result.success) {
      setTouched(
        Object.fromEntries(
          Object.keys(initialValues).map((field) => [field, true]),
        ),
      );
      return;
    }
    onRegister?.(result.data);
  }

  return (
    <form className="register-form" onSubmit={handleSubmit} noValidate>
      {/* Header */}
      <div className="register-form__header">
        <h1 className="register-form__title">{t("auth.register.title")}</h1>
        <p className="register-form__subtitle">{t("auth.register.subtitle")}</p>
      </div>

      {/* Google first */}
      <GoogleAuthButton
        mode="signup"
        onCredential={onGoogle}
        onError={onGoogleError}
        disabled={isSubmitting && !isGoogleSubmitting}
        loading={isGoogleSubmitting}
      />
      <AuthDivider />

      {/* Fields: name, then username (stacked) — email + phone side by side */}
      <div className="register-form__fields">
        <div className="register-form__field-full">
        <AuthField
          label={t("auth.fields.name")}
          name="name"
          value={values.name}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={t("auth.fields.namePlaceholder")}
          error={getFieldError("name")}
          autoComplete="name"
        />
        </div>

        <div className="register-form__field-full">
        <AuthField
          label={t("auth.fields.username")}
          name="username"
          value={values.username}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="raccon"
          error={getFieldError("username")}
          autoComplete="username"
        />
        </div>

        <div className="register-form__field-half">
          <AuthField
            label={t("auth.fields.email")}
            name="email"
            type="email"
            value={values.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="name@raccon.com"
            error={getFieldError("email")}
            autoComplete="email"
          />
        </div>

        <div className="register-form__field-half">
          <AuthField
            label={t("auth.fields.phone")}
            name="phone_number"
            type="tel"
            value={values.phone_number}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="5X XXX XXXX"
            error={getFieldError("phone_number")}
            maxLength={9}
            autoComplete="tel-national"
          />
        </div>

        {/* Password + confirm, side by side (like email + phone) */}
        <div className="register-form__field-half">
        <AuthField
          label={t("auth.fields.password")}
          name="password"
          type="password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={t("auth.fields.passwordPlaceholder")}
          error={getFieldError("password")}
          autoComplete="new-password"
        />
        </div>

        <div className="register-form__field-half">
        <AuthField
          label={t("auth.fields.confirmPassword")}
          name="confirmPassword"
          type="password"
          value={values.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={t("auth.fields.confirmPasswordPlaceholder")}
          error={getFieldError("confirmPassword")}
          autoComplete="new-password"
        />
        </div>
      </div>

      {/* Backend Messages */}
      <div className="register-form__feedback" aria-live="polite">
        {serverError ? (
          <InlineMessage type="error" message={serverError} />
        ) : successMessage ? (
          <InlineMessage type="success" message={successMessage} />
        ) : null}
      </div>

      {/* Submit */}
      <div className="register-form__submit">
        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={!isFormValid}
          loading={isSubmitting && !isGoogleSubmitting}
        >
          {t("auth.register.submit")}
        </Button>
      </div>

    </form>
  );
}
