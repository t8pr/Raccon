// display the the signal in the package card in store page  "تسلسلي أو نفدت"
export default function Chip({ children, tone = "accent", size = "sm" }) {
  return <span className={`chip chip--${tone} chip--${size}`}>{children}</span>;
}
