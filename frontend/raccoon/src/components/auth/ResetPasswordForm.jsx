// Reset password: new password + confirm (same rules as the register form)
import { useState } from "react";
import AuthField from "../ui/AuthField";
import Button from "../ui/Button";
import InlineMessage from "../ui/InlineMessage";

export function validateNewPassword(values) {
  const errors = {};

  if (!values.password) {
    errors.password = "أدخل كلمة المرور الجديدة.";
  } else if (values.password.length < 8) {
    errors.password = "كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل.";
  } else if (values.password.length > 72) {
    errors.password = "كلمة المرور طويلة، الحد الأعلى 72 حرفًا.";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "أكد كلمة المرور.";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "كلمتا المرور غير متطابقتين.";
  }

  return errors;
}

export default function ResetPasswordForm({
  onSubmit,
  isSubmitting = false,
  serverError = "",
  onEdit,
}) {
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
        <h1 className="login-form__title">عيّن كلمة مرور جديدة</h1>

        <p className="login-form__subtitle">
          اختر كلمة مرور قوية ما استخدمتها قبل.
        </p>
      </div>

      <div className="login-form__error" aria-live="polite">
        {serverError && <InlineMessage type="error" message={serverError} />}
      </div>

      {/* Fields */}
      <div className="login-form__fields">
        <AuthField
          label="كلمة المرور الجديدة"
          name="password"
          type="password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="8 أحرف أو أكثر"
          error={touched.password ? errors.password || "" : ""}
          autoComplete="new-password"
          autoFocus
        />

        <AuthField
          label="تأكيد كلمة المرور"
          name="confirmPassword"
          type="password"
          value={values.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="أعد كتابة كلمة المرور"
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
          احفظ كلمة المرور
        </Button>
      </div>
    </form>
  );
}
