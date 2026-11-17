import "./InlineMessage.css";
//we will ues this function for display the message that come from back-end

export default function InlineMessage({
  type = "info", // specifiy the type of massage
  message, //the context will display
  iconSide = "right", // the icone in left or right
}) {
  // type: error , warning,  info and success
  // meassage: like اسم المستخدم أو البريد الإلكتروني مستخدم مسبقًا
  const messageClass =
    `inline-message inline-message--${type}` +
    (iconSide === "left" ? " inline-message--icon-left" : "");

  const isAlert = type === "error" || type === "warning";

  return (
    <div className={messageClass} role={isAlert ? "alert" : "status"}>
      <svg
        className="inline-message__icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {type === "warning" ? (
          <path d="M12 3 2.7 20h18.6L12 3Z" />
        ) : (
          <circle cx="12" cy="12" r="9" />
        )}

        {type === "success" ? (
          <path d="m8 12 2.5 2.5L16 9" />
        ) : type === "info" ? (
          <>
            <path d="M12 11v5" />
            <path d="M12 8h.01" />
          </>
        ) : (
          <>
            <path d="M12 8v5" />
            <path d="M12 16h.01" />
          </>
        )}
      </svg>

      <span className="inline-message__text">{message}</span>
    </div>
  );
}
