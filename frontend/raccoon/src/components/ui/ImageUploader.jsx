import { useState, useRef } from "react";
import imageCompression from "browser-image-compression";
import { uploadHintImage } from "../../api/events/eventsApi";
import { useAuth } from "../../context/AuthContext";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";
import Button from "./Button";

export default function ImageUploader({ value, onChange, disabled }) {
  const { accessToken } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  async function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setError("");

    const options = {
      maxSizeMB: 0.2, // 200 KB
      maxWidthOrHeight: 1200, 
      useWebWorker: true,
      fileType: "image/webp",
    };

    try {
      const compressedFile = await imageCompression(file, options);
      const data = await uploadHintImage(compressedFile, accessToken);
      
      onChange(data.url);
    } catch (err) {
      setError(err.message || "فشل رفع الصورة. تأكد من حجمها وحاول مجدداً.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleRemove() {
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
          border: error ? "1px dashed var(--danger)" : undefined
        }}
      >
        {isUploading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <Loader2 size={24} className="ui-button__spinner" />
            <span>جاري ضغط ورفع الصورة...</span>
          </div>
        ) : value ? (
          <div style={{ position: "relative", width: "100%", textAlign: "center" }}>
            <img 
              src={value} 
              alt="تلميح" 
              style={{ maxWidth: "100%", maxHeight: "250px", borderRadius: "8px", objectFit: "contain" }} 
            />
            <div style={{ marginTop: "12px" }}>
              <Button variant="outline" onClick={handleRemove} disabled={disabled}>
                <Trash2 size={16} aria-hidden="true" /> إزالة الصورة
              </Button>
            </div>
          </div>
        ) : (
          <div 
            style={{ textAlign: "center", cursor: disabled ? "not-allowed" : "pointer" }} 
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            <ImagePlus size={32} style={{ opacity: 0.5, marginBottom: "8px" }} />
            <p style={{ margin: 0 }}>اضغط هنا لاختيار صورة</p>
            <p style={{ fontSize: "12px", opacity: 0.7, margin: "4px 0 0" }}>يتم ضغط الصورة وتحويلها لـ WebP تلقائياً</p>
          </div>
        )}
        <input
          type="file"
          accept="image/jpeg, image/png, image/webp"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
          style={{ display: "none" }}
          ref={fileInputRef}
        />
      </div>
      {error && <p className="hint-field__note" style={{ color: "var(--danger)", marginTop: "4px" }}>{error}</p>}
    </div>
  );
}