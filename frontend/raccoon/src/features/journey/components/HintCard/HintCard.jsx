import { Dialog } from "radix-ui";
import { Search, X } from "lucide-react";
import styles from "./HintCard.module.css";
import { useTranslation } from "react-i18next";

/*
  بطاقة عرض التلميح للاعب بعد المسح (غير HintField: ذاك حقل إدخال للمالك).
  4 حالات:
    صورة + نص   الصورة فوق، والنص تحتها
    صورة بس     العنوان فوق، والصورة أطول
    نص بس       النص يكبر ويأخذ البطاقة
    ولا شي      بطاقة بإطار متقطع: «ما لها تلميح»
  الصورة تكبر بالضغط عليها (Dialog من radix-ui).
*/
export default function HintCard({ text, image, label }) {
  const { t, i18n } = useTranslation();
  label = label ?? t("journey.hint.label");

  let variant = "";
  if (!image && !text) variant = styles.empty;
  else if (!image) variant = styles.textOnly;
  else if (!text) variant = styles.imageOnly;

  return (
    <section className={`${styles.card} ${variant}`.trim()} aria-label={label}>
      {/* صورة بس: العنوان فوق الصورة */}
      {image && !text && (
        <h2 className={`${styles.label} ${styles.labelTop}`}>
          <Search size={16} aria-hidden="true" />
          {label}
        </h2>
      )}

      {image && (
        <Dialog.Root>
          <Dialog.Trigger
            className={styles.media}
            aria-label={t("journey.hint.zoomLabel")}
          >
            <img src={image} alt={t("customization.image.label")} />
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
              <Dialog.Close
                className={styles.close}
                aria-label={t("journey.hint.closeImage")}
              >
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

      {!image && !text && (
        <p className={styles.emptyText}>{t("journey.hint.empty")}</p>
      )}
    </section>
  );
}
