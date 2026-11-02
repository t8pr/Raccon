export default function HintField({ text, onTextChange, disabled = false }) {
return (
<div className="hint-field">
    <div className="hint-field__header">
        <label className="hint-field__label" htmlFor="tag-hint">نص التلميح</label>
        <span className="hint-field__indicator">Optional</span>
    </div>
    <textarea className="hint-field__input"
        id="tag-hint"
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        disabled={disabled}
        maxLength={255}
        placeholder="اكتب تلميح للقطعة..."
    />
    <div className="hint-field__footer">
        <p className="hint-field__note">يظهر للاعبين تحت رقم القطعة.</p>
        <span className="hint-field__counter">{text.length}/255</span>
    </div>
</div>
)
}