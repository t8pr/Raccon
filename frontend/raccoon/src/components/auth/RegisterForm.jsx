import { useState } from "react";
import { Link } from "react-router-dom";
import googleLogo from "../../assets/googleLogo.png";
import AuthField from "../ui/AuthField";
import Button from "../ui/Button";
import InlineMessage from "../ui/InlineMessage";
import { registerSchema, validateForm } from "../../utils/validation";

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
  serverError = "",
  fieldErrors = {}, // any field error from server
  successMessage = "",
  onEdit,
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
        <h1 className="register-form__title">أنشئ حسابك</h1>
      </div>

      {/* Fields */}
      <div className="register-form__fields">
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

        <AuthField
          label="اسم المستخدم"
          name="username"
          value={values.username}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="زي: reem_s"
          error={getFieldError("username")}
          autoComplete="username"
        />

        <div className="register-form__field-full">
          <AuthField
            label="الإيميل"
            name="email"
            type="email"
            value={values.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="name@example.com"
            error={getFieldError("email")}
            autoComplete="email"
          />
        </div>

        <div className="register-form__field-full">
          <AuthField
            label="رقم الجوال"
            name="phone_number"
            type="tel"
            value={values.phone_number}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="5X XXX XXXX"
            helper="رقم الجوال يبدأ بـ 5"
            error={getFieldError("phone_number")}
            maxLength={9}
            autoComplete="tel-national"
          />
        </div>

        {/*Password*/}
        <AuthField
          label="كلمة المرور"
          name="password"
          type="password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="8 أحرف أو أكثر"
          helper="8 أحرف أو أكثر"
          error={getFieldError("password")}
          autoComplete="new-password"
        />
        {/*confirmPassword*/}
        <AuthField
          label="تأكيد كلمة المرور"
          name="confirmPassword"
          type="password"
          value={values.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="أعد كتابة كلمة المرور"
          error={getFieldError("confirmPassword")}
          autoComplete="new-password"
        />
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

      {/* Google Button */}

      <div className="register-form__google">
        <Button type="button" variant="secondary" fullWidth disabled>
          <img src={googleLogo} alt="" className="register-form__google-logo" />

          <span>
            المتابعة باستخدام <bdi>Google</bdi>
          </span>
        </Button>
      </div>

      {/* Footer */}
      <div className="register-form__footer">
        <p className="register-form__signin">
          عندك حساب؟ <Link to="/login">تسجيل الدخول</Link>
        </p>
      </div>
    </form>
  );
}
