import "./Button.css";
export default function Button({
  children,
  variant = "primary", // the defualt color one
  type = "button",
  disabled = false,
  loading = false,
  fullWidth = false,
  className = "",
  onClick,
  ...props
}) {
  // Array compain have 4 element css classes
  const classes = [
    "ui-button",
    `ui-button--${variant}`,
    fullWidth ? "ui-button--full" : "",
    className,
  ]
    .filter(Boolean) // in js it delete any value "" , null, undefined, false, 0
    .join(" "); // combine the array element in one string and put space between them like "ui-button ui-button--primary(${variant})"

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading} // the button is not work untill it fill all the input
      onClick={onClick}
      aria-busy={loading}
      {...props}
    >
      {loading && <span className="ui-button__spinner" aria-hidden="true" />}

      <span>{children}</span>
    </button>
  );
}
