import { useState } from "react";
import { Link } from "react-router-dom";
import AuthField from "../ui/AuthField";
import Button from "../ui/Button";
import InlineMessage from "../ui/InlineMessage";
import { loginSchema, validateForm } from "../../utils/validation";

export default function LoginForm({
  onLogin,
  isSubmitting = false,
  serverError = "",
  notice = "", // success message, e.g. after resetting the password
  onEdit,
}) {
  const [values, setValues] = useState({ identifier: "", password: "" });
  const [touched, setTouched] = useState({});

  // Check if all required fields have values
  const validation = validateForm(loginSchema, values);
  const errors = validation.errors;
  const isFormValid = validation.success;

  // Update input values
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

  // Mark the field as touched
  function handleBlur(event) {
    const { name } = event.target;

    setTouched((previous) => ({
      ...previous,
      [name]: true,
    }));
  }

  // Submit Login
  function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;

    const result = validateForm(loginSchema, values);

    if (!result.success) {
      setTouched({
        identifier: true,
        password: true,
      });
      return;
    }
    onLogin?.(result.data);
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      {/* Header */}
      <div className="login-form__header">
        <h1 className="login-form__title">هلا، حياك من جديد</h1>

        <p className="login-form__subtitle">ادخل حسابك عشان تتابع باقاتك.</p>
      </div>

      <div className="login-form__error" aria-live="polite">
        {serverError ? (
          <InlineMessage type="error" message={serverError} />
        ) : (
          notice && <InlineMessage type="success" message={notice} />
        )}
      </div>

      {/* Fields */}
      <div className="login-form__fields">
        <AuthField
          label="اسم المستخدم أو الإيميل"
          name="identifier"
          type="text"
          inputDir="auto" //for language
          value={values.identifier}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="اسم المستخدم أو البريد الإلكتروني"
          error={touched.identifier ? errors.identifier || "" : ""}
          autoComplete="username"
        />

        <AuthField
          label="كلمة المرور"
          name="password"
          type="password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="أدخل كلمة المرور"
          error={touched.identifier ? errors.password || "" : ""}
          autoComplete="current-password"
        />
      </div>

      {/* Forgot Password */}
      <div className="login-form__forgot">
        <Link to="/forgot-password">نسيت كلمة المرور؟</Link>
      </div>

      {/* Submit */}
      <div className="login-form__submit">
        <Button
          type="submit" // make inSubmit work
          variant="primary"
          fullWidth
          disabled={!isFormValid}
          loading={isSubmitting} // children
        >
          ادخل
        </Button>
      </div>

      {/* Register Link */}
      <div className="login-form__footer">
        <p>
          أول مرة معنا؟ <Link to="/register">أنشئ حساب جديد</Link>
        </p>
      </div>
    </form>
  );
}
