// A full-panel message inside the auth layout:
// "check your email", "link expired", "password changed", "checking the link…"
export default function AuthStatus({
  tone = "info", // info | success | error | loading
  title,
  text,
  children, // actions (buttons, links)
}) {
  const isAlert = tone === "error";

  return (
    <div
      className={`auth-status auth-status--${tone}`}
      role={isAlert ? "alert" : "status"}
      aria-live="polite"
    >
      <div className="auth-status__icon" aria-hidden="true">
        {tone === "loading" ? (
          <span className="ui-button__spinner auth-status__spinner" />
        ) : (
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {tone === "success" && <path d="m6 12.5 4 4L18 8" />}
            {tone === "error" && (
              <>
                <path d="M12 7.5v6" />
                <path d="M12 17h.01" />
              </>
            )}
            {tone === "info" && (
              <>
                <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
                <path d="m3.5 7 8.5 6 8.5-6" />
              </>
            )}
          </svg>
        )}
      </div>

      <h1 className="auth-status__title">{title}</h1>

      {text && <p className="auth-status__text">{text}</p>}

      {children && <div className="auth-status__actions">{children}</div>}
    </div>
  );
}
