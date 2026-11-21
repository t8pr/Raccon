import { useRef } from "react";
import { Dialog } from "radix-ui";
import Button from "../Button";
import styles from "./ConfirmDialog.module.css";

export default function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.content}
          dir="rtl"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            cancelRef.current?.focus();
          }}
        >
          <Dialog.Title className={styles.title}>{title}</Dialog.Title>
          <Dialog.Description className={styles.description}>
            {description}
          </Dialog.Description>
          <div className={styles.actions}>
            <Button onClick={onConfirm}>نعم</Button>
            <Button ref={cancelRef} variant="outline" onClick={onCancel}>
              إلغاء
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
