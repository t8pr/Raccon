const trapOptions = [
  { value: "none", label: "بدون" },
  { value: "freeze", label: "تجميد" },
  { value: "boom", label: "بووم" },
  { value: "choose", label: "اختار فخ" },
];


export default function TrapField({
    value, 
    onValueChange,
    freezeSeconds,
    onFreezeSecondsChange,
    disabled = false}) {

    const duration = Number(freezeSeconds) || 30;

    const formattedDuration =
        `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`;

  return (
    <fieldset className="trap-field" disabled={disabled}>
      <legend>فخ — اختياري</legend>

    <div className="trap-field__options">
      {trapOptions.map((option) => (
        <label className="trap-field__option" key={option.value}>
          <input
            type="radio"
            name="tag-trap"
            value={option.value}
            checked={value === option.value}
            onChange={() => onValueChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
      </div>

      {value === "freeze" && (
        <div className="trap-field__freeze">
        <div className="trap-field__duration">
            <span>مدة التجميد</span>

        <div className="trap-field__stepper">
        <button
          type="button"
          disabled={duration <= 1}
          onClick={() =>
            onFreezeSecondsChange(Math.max(1, duration - 1))
          }
        >
          −
        </button>

        <output aria-live="polite">{formattedDuration}</output>

        <button
          type="button"
          aria-label="زيادة مدة التجميد"
          disabled={duration >= 180}
          onClick={() =>
            onFreezeSecondsChange(Math.min(180, duration + 1))
          }
        >
          +
        </button>
      </div>
    </div>

    <p>
     من ثانية إلى 3 دقائق.
     اللاعب المجمّد ما يقدر يمسح أي قطعة لين يخلص الوقت.
    </p>
  </div>
)
}
    {value === "boom" && (
    <p className="trap-field__note">
        اللي يمسح القطعة اللي فيها الفخ يخسر نقاط على طول.
    </p>
    )}

    {value === "choose" && (
    <p className="trap-field__note">
        اختر وش يصير للي يمسحها بعدك
    </p>
    )}
    </fieldset>
  );
}