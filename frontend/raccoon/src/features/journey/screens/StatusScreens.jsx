import ScanLayout from "../components/ScanLayout";
import InfoCard from "../components/InfoCard";
import { HomeAction } from "../components/ScanActions";
import { LockBadge, MarkBadge } from "../components/ScanBadges";

// شاشات ما قبل النتيجة: التحميل، الرابط الناقص، ولا بيانات.
// shell: الخصائص المشتركة لـ ScanLayout (المتصدرون) من ScanPage.

export function LoadingScreen({ shell }) {
  return (
    <ScanLayout
      {...shell}
      showStats={false}
      title="لحظة..."
      badge={<MarkBadge />}
      pill="جاري قراءة القطعة"
    />
  );
}

export function InvalidLinkScreen({ shell, message, onHome }) {
  return (
    <ScanLayout
      {...shell}
      showStats={false}
      title="رابط غير صالح"
      badge={<LockBadge />}
      pill="ما قدرنا نقرأ الرابط"
      actions={<HomeAction onHome={onHome} />}
    >
      <InfoCard title={message} text="امسح القطعة مرة ثانية بجوالك." />
    </ScanLayout>
  );
}

export function EmptyScreen({ shell, onHome }) {
  return (
    <ScanLayout
      {...shell}
      showStats={false}
      title="ما فيه شي"
      badge={<MarkBadge />}
      pill="لا توجد بيانات لعرضها"
      actions={<HomeAction onHome={onHome} />}
    />
  );
}
