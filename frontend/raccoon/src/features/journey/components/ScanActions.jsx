import Button from "../../../shared/ui/Button/Button";
import { useTranslation } from "react-i18next";

// أزرار أسفل شاشات المسح. كلها ترجع للرئيسية ما عدا «شوف المتصدرين».

export function HomeAction({ onHome }) {
  const { t } = useTranslation();
  return <Button onClick={onHome}>{t("journey.home")}</Button>;
}

export function ContinueAction({ onHome, label }) {
  const { t } = useTranslation();
  return <Button onClick={onHome}>{label ?? t("journey.keepSearching")}</Button>;
}

// للجولة المنتهية: المتصدرون أولًا، والرئيسية ثانيًا
export function BoardAndHomeActions({ onBoard, onHome }) {
  const { t } = useTranslation();
  return (
    <>
      <Button onClick={onBoard}>{t("journey.seeBoard")}</Button>
      <Button variant="outline" onClick={onHome}>
        {t("journey.backHome")}
      </Button>
    </>
  );
}
