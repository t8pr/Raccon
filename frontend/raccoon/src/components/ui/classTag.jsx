import { Snowflake, Bomb, Dices } from "lucide-react";

const trapIcons = {
  freeze: Snowflake,
  boom: Bomb,
  choose: Dices,
};

export default function ClassTag({
  number,
  configured = false,
  selected = false,
  trapType = "none",
  disabled = false,
  onClick,
}) {
  const TrapIcon = trapIcons[trapType];

  const classes = [
    "class-tag",
    configured ? "class-tag--configured" : "",
    selected ? "class-tag--current" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`القطعة ${number}${
        TrapIcon ? "، فيها فخ" : ""
      }، ${configured ? "جاهزة" : "غير محفوظة"}`}
    >
      <span className="class-tag__circle">
        {String(number).padStart(2, "0")}

        {TrapIcon && (
          <span className="class-tag__trap" aria-hidden="true">
            <TrapIcon size={11} strokeWidth={2} />
          </span>
        )}
      </span>

      <span className="class-tag__label">{selected ? "قيد التعديل" : ""}</span>
    </button>
  );
}
