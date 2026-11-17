import { useState } from "react";
import AuthField from "../ui/AuthField";
import Button from "../ui/Button";
import InlineMessage from "../ui/InlineMessage";
import GoogleAuthButton from "./GoogleAuthButton";
import AuthDivider from "./AuthDivider";
import { registerSchema, validateForm } from "../../utils/validation";

const initialValues = {
  name: "",
  username: "",
  email: "",
  phone_number: "",
  password: "",
};

export default function RegisterForm({
  onRegister,
  isSubmitting = false,
  serverError = "",
  fieldErrors = {}, // any field error from server
  successMessage = "",
  onEdit,
  onGoogle, // (credential) => void
  onGoogleError,
}) {
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
        <h1 className="register-form__title">أنشئ حسابك</h1>
        <p className="register-form__subtitle">أنشئ حسابك عشان تتابع تجاربك.</p>
      </div>

      {/* Google first */}
      <GoogleAuthButton
        mode="signup"
        onCredential={onGoogle}
        onError={onGoogleError}
        disabled={isSubmitting}
      />
      <AuthDivider />

      {/* Fields: name, then username (stacked) — email + phone side by side */}
      <div className="register-form__fields">
        <div className="register-form__field-full">
        <AuthField
          label="الاسم"
          name="name"
          value={values.name}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="اسمك"
          error={getFieldError("name")}
          autoComplete="name"
        />
        </div>

        <div className="register-form__field-full">
        <AuthField
          label="اسم المستخدم"
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
            label="الإيميل"
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
            label="رقم الجوال"
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

        {/*Password*/}
        <div className="register-form__field-full">
        <AuthField
          label="كلمة المرور"
          name="password"
          type="password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="8 حروف أو أكثر"
          error={getFieldError("password")}
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
          loading={isSubmitting}
        >
          أنشئ حسابي
        </Button>
      </div>

    </form>
  );
}
