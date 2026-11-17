export default function AuthDivider({ label = "أو" }) {
  return (
    <div className="auth-divider" role="separator" aria-label={label}>
      <span>{label}</span>
    </div>
  );
}
