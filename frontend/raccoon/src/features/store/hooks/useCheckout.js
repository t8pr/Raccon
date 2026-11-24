import { useEffect, useRef, useState } from "react";

import { checkoutUrl } from "../checkoutLinks";
import { useTranslation } from "react-i18next";

/*
  الشراء: نافذة تأكيد ثم تحويل لصفحة الدفع في رمز (نفس التبويب).
    selected     البكج المعروض في نافذة التأكيد (أو null)
    redirecting  id البكج الجاري تحويله (يعطّل باقي الأزرار)
    error        رسالة فوق البطاقات
*/
export function useCheckout() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(null);
  const [redirecting, setRedirecting] = useState(null);
  const [error, setError] = useState("");

  const dialogRef = useRef(null);
  // الزر الذي فتح النافذة، لإعادة التركيز إليه بعد الإغلاق
  const openerRef = useRef(null);
  // يمنع الضغط المزدوج أثناء التحويل
  const purchaseLockRef = useRef(false);

  // فتح النافذة ومنع تمرير الخلفية ما دام فيه بكج مختار
  useEffect(() => {
    if (!selected) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current.showModal();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);

  // الرجوع من صفحة الدفع بزر «رجوع» يعيد الصفحة من الذاكرة؛ نفك القفل.
  useEffect(() => {
    function reset() {
      purchaseLockRef.current = false;
      setRedirecting(null);
    }

    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  function close() {
    dialogRef.current?.close();
  }

  // يُستدعى من حدث close في <dialog> (زر، Esc، أو الضغط خارج النافذة)
  function handleClosed() {
    setSelected(null);
    openerRef.current?.focus();
  }

  // زر «شراء» على البطاقة
  function confirm(pkg) {
    if (purchaseLockRef.current) return;

    setError("");

    if (!checkoutUrl(pkg.purchaseUrl)) {
      setError(t("store.linkUnavailable"));
      return;
    }

    openerRef.current = document.activeElement;
    setSelected(pkg);
  }

  // زر «شراء» داخل النافذة
  function buy() {
    const url = checkoutUrl(selected?.purchaseUrl);

    if (!url || purchaseLockRef.current) return;

    purchaseLockRef.current = true;
    setRedirecting(selected.id);
    close();

    try {
      window.location.assign(url);
    } catch {
      purchaseLockRef.current = false;
      setRedirecting(null);
      setError(t("store.openPaymentFailed"));
    }
  }

  return {
    dialogRef,
    selected,
    redirecting,
    error,
    confirm,
    buy,
    close,
    handleClosed,
  };
}
