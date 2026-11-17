import { useState, useRef, useEffect } from "react";
import { prepareHintImage } from "../../utils/prepareHintImage";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";
import Button from "./Button";

// value is a saved URL, a prepared local File, or an empty string.
// This component never uploads. The page uploads only when Save is pressed.
export default function ImageUploader({
  value,
  onChange,
  disabled,
  onBusyChange,
}) {
  const [isPreparing, setIsPreparing] = useState(false);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const controllerRef = useRef(null);

  useEffect(() => {
    if (!(value instanceof Blob)) {
      setPreview(typeof value === "string" ? value : "");
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      onBusyChange?.(false);
    },
    [onBusyChange],
  );

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || disabled || controllerRef.current) return;

    const controller = new AbortController();
    controllerRef.current = controller;
    setIsPreparing(true);
    onBusyChange?.(true);
    setError("");
    try {
      const prepared = await prepareHintImage(file, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) onChange(prepared);
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err.message || "تعذر تجهيز الصورة. حاول بصورة أخرى.");
      }
    } finally {
      if (!controller.signal.aborted) {
        controllerRef.current = null;
        setIsPreparing(false);
        onBusyChange?.(false);
      }
    }
  }

  function handleRemove() {
    if (disabled || controllerRef.current) return;
    setError("");
    onChange("");
  }

  return (
    <div className="hint-field" style={{ marginTop: "16px" }}>
      <div className="hint-field__header">
        <label className="hint-field__label">صورة التلميح (اختياري)</label>
      </div>

      <div
        className="ImageUploader"
        style={{
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          minHeight: value ? "auto" : "100px",
          border: error ? "1px dashed var(--danger)" : undefined,
        }}
      >
        {isPreparing ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Loader2 size={24} className="ui-button__spinner" />
            <span>جاري فحص وتجهيز الصورة...</span>
          </div>
        ) : value ? (
          <div
            style={{ position: "relative", width: "100%", textAlign: "center" }}
          >
            <img
              src={preview || undefined}
              alt="تلميح"
              style={{
                maxWidth: "100%",
                maxHeight: "250px",
                borderRadius: "8px",
                objectFit: "contain",
              }}
            />
            <div style={{ marginTop: "12px" }}>
              <Button
                variant="outline"
                onClick={handleRemove}
                disabled={disabled}
              >
                <Trash2 size={16} aria-hidden="true" /> إزالة الصورة
              </Button>
              <Button
                variant="outline"
                disabled={disabled || isPreparing}
                onClick={() => fileInputRef.current?.click()}
              >
                استبدال الصورة
              </Button>
            </div>
          </div>
        ) : (
          <div className="hint-image-picker">
            <button
              type="button"
              className="hint-image-picker__button"
              aria-label="اختيار صورة التلميح"
              aria-describedby="hint-image-size-limit"
              disabled={disabled || isPreparing}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus size={32} aria-hidden="true" />
            </button>
            <p id="hint-image-size-limit" className="hint-image-picker__limit">
              الحد الأقصى لحجم الصورة: <bdi>2 MB</bdi>
            </p>
          </div>
        )}
        <input
          type="file"
          accept="image/jpeg, image/png, image/webp"
          onChange={handleFileChange}
          disabled={disabled || isPreparing}
          style={{ display: "none" }}
          ref={fileInputRef}
        />
      </div>
      {error && (
        <p
          role="alert"
          className="hint-field__note"
          style={{ color: "var(--danger)", marginTop: "4px" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
