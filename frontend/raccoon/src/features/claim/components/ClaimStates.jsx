import Button from "../../../shared/ui/Button";
import InlineMessage from "../../../shared/ui/InlineMessage";

// محتوى البطاقة قبل وصول بيانات الباكج: رابط خاطئ، تحميل، أو فشل.

export function InvalidLinkState() {
  return (
    <>
      <h1 id="claim-title">رابط الاستلام غير صالح</h1>
      <InlineMessage
        type="error"
        message="تأكد من فتح الرابط الكامل الذي وصلك في الإيميل."
      />
    </>
  );
}

export function CheckingState() {
  return (
    <>
      <h1 id="claim-title">استلم باكجك</h1>
      <InlineMessage message="جارٍ التحقق من الباكج والحساب..." />
    </>
  );
}

export function RestoreErrorState({ message }) {
  return (
    <>
      <h1 id="claim-title">تعذر التحقق من الحساب</h1>
      <InlineMessage type="error" message={message} />
      <Button onClick={() => window.location.reload()}>إعادة المحاولة</Button>
    </>
  );
}

export function PreviewErrorState({ notFound, retrying, onRetry }) {
  return (
    <>
      <h1 id="claim-title">تعذر تحميل الباكج</h1>

      <InlineMessage
        type="error"
        message={
          notFound
            ? "الباكج غير موجود. تأكد من رابط الاستلام."
            : "تعذر الاتصال بالخادم. حاول مرة أخرى."
        }
      />

      <Button variant="outline" loading={retrying} onClick={onRetry}>
        إعادة المحاولة
      </Button>
    </>
  );
}

export function MissingPackState() {
  return <InlineMessage type="error" message="لم تتوفر معلومات الباكج." />;
}
