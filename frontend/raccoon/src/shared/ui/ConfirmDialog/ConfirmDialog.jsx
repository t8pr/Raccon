import { useRef } from "react";
import { Dialog } from "radix-ui";
import Button from "../Button/Button";
import styles from "./ConfirmDialog.module.css";
import { useTranslation } from "react-i18next";

export default function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  pending = false,
  children,
}) {
  const { t, i18n } = useTranslation();
  const cancelRef = useRef(null);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !pending) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.content}
          dir={i18n.dir()}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            cancelRef.current?.focus();
          }}
        >
          <Dialog.Title className={styles.title}>{title}</Dialog.Title>
          <Dialog.Description className={styles.description}>
            {description}
          </Dialog.Description>
          {children}
          <div className={styles.actions}>
            <Button loading={pending} onClick={onConfirm}>{t("common.yes")}</Button>
            <Button ref={cancelRef} variant="outline" disabled={pending} onClick={onCancel}>
              {t("common.cancel")}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
