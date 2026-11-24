import { Snowflake, Bomb, Dices } from "lucide-react";
import { useTranslation } from "react-i18next";

const trapIcons = {
  freeze: Snowflake,
  boom: Bomb,
  choose: Dices,
};

export default function ClassTag({
  number,
  configured = false,
  selected = false,
  editing = false,
  staged = false,
  trapType = "none",
  disabled = false,
  onClick,
}) {
  const { t } = useTranslation();
  const TrapIcon = trapIcons[trapType];

  const classes = [
    "class-tag",
    configured ? "class-tag--configured" : "",
    selected ? "class-tag--current" : "",
    staged ? "class-tag--staged" : "",
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
      aria-label={[
        t("customization.pieceNumber", { number }),
        TrapIcon && t("customization.tag.hasTrap"),
        staged
          ? t("customization.tag.stagedLong")
          : configured
            ? t("customization.legend.ready")
            : t("customization.legend.unsaved"),
      ]
        .filter(Boolean)
        .join(t("common.listSeparator"))}
    >
      <span className="class-tag__circle">
        {String(number).padStart(2, "0")}

        {TrapIcon && (
          <span className="class-tag__trap" aria-hidden="true">
            <TrapIcon size={11} strokeWidth={2} />
          </span>
        )}
      </span>

      <span className="class-tag__label">
        {editing
          ? t("customization.tag.editing")
          : staged
            ? t("customization.tag.staged")
            : ""}
      </span>
    </button>
  );
}
