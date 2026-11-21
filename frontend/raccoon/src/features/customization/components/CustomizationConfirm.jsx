import ConfirmDialog from "../../../shared/ui/ConfirmDialog/ConfirmDialog";

// نافذة تأكيد واحدة لكل إجراءات صفحة التخصيص.
// action: null (مغلقة) | "saveAll" | "cancelEdit" | "stopRound" | "edit"
function getCopy(action, { status, editsRemaining }) {
  // الحفظ النهائي (زر «حفظ» بدون تعديل على القطعة الحالية): نفس السؤال في كل الحالات
  if (action === "saveAll") {
    return {
      title: status === "paused" ? "حفظ التعديلات" : "حفظ جميع القطع",
      description: "هل ترغب في المتابعة وحفظ التعديلات؟",
    };
  }

  // «إلغاء التعديل» وفيه تعديلات ما انرسلت
  if (action === "cancelEdit") {
    return {
      title: "إلغاء التعديل",
      description: "هل ترغب في إلغاء التعديل؟ التعديلات اللي ما انحفظت بتروح.",
    };
  }

  if (action === "stopRound") {
    return {
      title: "إيقاف الجولة",
      description: "هل أنت متأكد أنك تريد إيقاف الجولة؟",
    };
  }

  return {
    title: "تعديل الباقة",
    description: `هل أنت متأكد أنك تريد تعديل الباقة؟ عدد التعديلات المتاحة: ${editsRemaining} يُحتسب التعديل عند الحفظ`,
  };
}

export default function CustomizationConfirm({
  action,
  status,
  editsRemaining,
  onConfirm,
  onCancel,
}) {
  const { title, description } = getCopy(action, { status, editsRemaining });

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
