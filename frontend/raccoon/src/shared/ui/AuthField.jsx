import { useId, useState } from "react";
import "./AuthField.css";
// we have 5 state which is error(invalid input), success(valid input), disabled(u can not do any edit), focus(onblur) and normal one (default)
export default function AuthField({
  id,
  label,
  name,
  type = "text", // we have 4 type:  1 for text 2 for email 3 for password 4 for phone
  value,
  onChange,
  onBlur,
  placeholder = "",
  helper = "",
  error = "",
  success = false,
  disabled = false,
  inputDir,
  className = "",
  ...inputProps
}) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const messageId = `${fieldId}-message`;

  const [showPassword, setShowPassword] = useState(false); // it just the eye in the password field and it is local state no need for all page to now this state

  const isPassword = type === "password";
  const isPhone = type === "tel";

  const currentType = isPassword && showPassword ? "text" : type;

  const direction =
    inputDir || (["email", "password", "tel"].includes(type) ? "ltr" : "rtl");

  const message = error || helper;

  // this for global css classes
  const classes = [
    "auth-field",
    error && "auth-field--error",
    success && !error && "auth-field--success",
    disabled && "auth-field--disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {/* Label */}
      <label htmlFor={fieldId} className="auth-field__label">
        {label}
      </label>

      {/* Input Container */}
      <div className="auth-field__control">
        {/* Saudi Phone Prefix */}
        {isPhone && (
          <span className="auth-field__phone-prefix">
            <span aria-hidden="true">🇸🇦</span>
            <span>+966</span>
          </span>
        )}

        {/* Input */}
        <input
          id={fieldId}
          name={name}
          type={currentType}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          dir={direction}
          className={
            isPassword
              ? "auth-field__input auth-field__input--password"
              : "auth-field__input"
          }
          aria-invalid={Boolean(error)}
          aria-describedby={message ? messageId : undefined}
          inputMode={isPhone ? "numeric" : undefined}
          {...inputProps}
        />

        {/* Password Visibility */}
        {isPassword && (
          <button
            type="button"
            className="auth-field__toggle"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={disabled}
            aria-label={
              showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
            }
            aria-pressed={showPassword}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
              <circle cx="12" cy="12" r="3" />

              {!showPassword && <path d="M3 3 21 21" />}
            </svg>
          </button>
        )}
      </div>

      {/* Helper / Error Message */}
      <p
        id={messageId}
        className="auth-field__message"
        role={error ? "alert" : undefined}
        aria-hidden={!message}
      >
        {message || "\u00A0"}
      </p>
    </div>
  );
}
