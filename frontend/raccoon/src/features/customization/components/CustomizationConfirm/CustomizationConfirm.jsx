import ConfirmDialog from "../../../../shared/ui/ConfirmDialog/ConfirmDialog";
import { useTranslation } from "react-i18next";

// نافذة تأكيد واحدة لكل إجراءات صفحة التخصيص.
// action: null (مغلقة) | "saveAll" | "cancelEdit" | "stopRound" | "edit"
function getCopy(action, { status, editsRemaining }, t) {
  // الحفظ النهائي (زر «حفظ» بدون تعديل على القطعة الحالية): نفس السؤال في كل الحالات
  if (action === "saveAll") {
    return {
      title:
        status === "paused"
          ? t("customization.confirm.saveEditsTitle")
          : t("customization.confirm.saveAllTitle"),
      description: t("customization.confirm.saveText"),
    };
  }

  // «إلغاء التعديل» وفيه تعديلات ما انرسلت
  if (action === "cancelEdit") {
    return {
      title: t("customization.confirm.cancelEditTitle"),
      description: t("customization.confirm.cancelEditText"),
    };
  }

  if (action === "stopRound") {
    return {
      title: t("customization.confirm.stopTitle"),
      description: t("customization.confirm.stopText"),
    };
  }

  return {
    title: t("customization.round.editPackage"),
    description: t("customization.confirm.editText", { count: editsRemaining }),
  };
}

export default function CustomizationConfirm({
  action,
  status,
  editsRemaining,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation();
  const { title, description } = getCopy(action, { status, editsRemaining }, t);

  return (
    <ConfirmDialog
      open={action !== null}
      title={title}
      description={description}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
