import ConfirmDialog from "../../../shared/ui/ConfirmDialog/ConfirmDialog";

// نافذة تأكيد واحدة لثلاثة إجراءات في صفحة التخصيص.
// action: null (مغلقة) | "saveAll" | "stopRound" | "edit"
function getCopy(action, { status, editsRemaining }) {
  if (action === "saveAll") {
    const editCost =
      status === "paused"
        ? ` سيُستهلك تعديل واحد عند نجاح الحفظ. التعديلات المتاحة: ${editsRemaining}.${editsRemaining === 1 ? " هذا آخر تعديل متاح." : ""}`
        : "";

    return {
      title: "حفظ جميع القطع",
      description: `هل أنت متأكد من حفظ جميع القطع، بما فيها الفارغة؟ سيتم حفظ تغييرات القطعة الحالية مع إعدادات بقية القطع.${editCost}`,
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
