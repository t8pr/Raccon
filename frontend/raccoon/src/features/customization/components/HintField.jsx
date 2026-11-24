import { useTranslation } from "react-i18next";
export default function HintField({ text, onTextChange, disabled = false }) {
const { t } = useTranslation();
return (
<div className="hint-field">
    <div className="hint-field__header">
        <label className="hint-field__label" htmlFor="tag-hint">{t("customization.hint.label")}</label>
        <span className="hint-field__indicator">{t("common.optional")}</span>
    </div>
    <textarea className="hint-field__input"
        id="tag-hint"
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        disabled={disabled}
        maxLength={255}
        placeholder={t("customization.hint.placeholder")}
    />
    <div className="hint-field__footer">
        <p className="hint-field__note">{t("customization.hint.note")}</p>
        <span className="hint-field__counter">{text.length}/255</span>
    </div>
</div>
)
}