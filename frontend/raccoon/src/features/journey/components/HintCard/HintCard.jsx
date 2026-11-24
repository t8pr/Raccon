import { Dialog } from "radix-ui";
import { Maximize2, Search, X } from "lucide-react";
import styles from "./HintCard.module.css";
import { useTranslation } from "react-i18next";

// بطاقة عرض التلميح للاعب بعد المسح (غير HintField: ذاك حقل إدخال للمالك).
// مع صورة: الصورة بعرض البطاقة وتُكبَّر بالضغط. بدون صورة: النص يكبر ويأخذ البطاقة.
export default function HintCard({ text, image, label }) {
  const { t, i18n } = useTranslation();
  label = label ?? t("journey.hint.label");
  if (!text && !image) return null;

  return (
    <section
      className={`${styles.card} ${image ? "" : styles.textOnly}`.trim()}
      aria-label={label}
    >
      {image && (
        <Dialog.Root>
          <Dialog.Trigger
            className={styles.media}
            aria-label={t("journey.hint.zoomLabel")}
          >
            <img src={image} alt={t("customization.image.label")} />
            <span className={styles.zoom}>
              <Maximize2 size={14} aria-hidden="true" />
              {t("journey.hint.zoom")}
            </span>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className={styles.overlay} />
            <Dialog.Content
              className={styles.lightbox}
              dir={i18n.dir()}
              aria-describedby={undefined}
            >
              <Dialog.Title className={styles.srOnly}>
                {t("customization.image.label")}
              </Dialog.Title>
              <Dialog.Close className={styles.close} aria-label={t("journey.hint.closeImage")}>
                <X size={22} aria-hidden="true" />
              </Dialog.Close>
              <figure className={styles.figure}>
                <img src={image} alt={t("customization.image.label")} />
                {text && <figcaption>{text}</figcaption>}
              </figure>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {text && (
        <div className={styles.body}>
          <h2 className={styles.label}>
            <Search size={16} aria-hidden="true" />
            {label}
          </h2>
          <p className={styles.text}>{text}</p>
        </div>
      )}
    </section>
  );
}
