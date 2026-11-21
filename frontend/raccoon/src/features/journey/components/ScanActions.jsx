import Button from "../../../shared/ui/Button";

// أزرار أسفل شاشات المسح. كلها ترجع للرئيسية ما عدا «شوف المتصدرين».

export function HomeAction({ onHome }) {
  return <Button onClick={onHome}>رجوع للرئيسية</Button>;
}

export function ContinueAction({ onHome, label = "كمّل البحث" }) {
  return <Button onClick={onHome}>{label}</Button>;
}

// للجولة المنتهية: المتصدرون أولًا، والرئيسية ثانيًا
export function BoardAndHomeActions({ onBoard, onHome }) {
  return (
    <>
      <Button onClick={onBoard}>شوف المتصدرين</Button>
      <Button variant="outline" onClick={onHome}>
        ارجع للرئيسية
      </Button>
    </>
  );
}
