import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { server } from "./test/server";
import i18n from "./i18n";

// الاختبارات دايم بالعربي (لغة jsdom الافتراضية en-US).
// مرة وقت التحميل (للقيم اللي تنحسب أثناء import) ومرة قبل كل اختبار.
i18n.changeLanguage("ar");
beforeEach(() => i18n.changeLanguage("ar"));

// findBy / waitFor ينتظرون 3 ثواني بدل ثانية: مع تقرير التغطية وكل الملفات مع بعض الجهاز أبطأ
configure({ asyncUtilTimeout: 3000 });

// jsdom ما يدعم showModal و close في <dialog>. بديل يتصرف مثل المتصفح:
// showModal يفتح ويركّز على عنصر [autofocus] أو أول عنصر قابل للتركيز،
// و close يطلق حدث "close".
if (
  typeof HTMLDialogElement !== "undefined" &&
  !HTMLDialogElement.prototype.showModal
) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
    const target =
      this.querySelector("[autofocus]") ||
      this.querySelector(
        "button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex='-1'])",
      );
    target?.focus();
  };

  HTMLDialogElement.prototype.close = function close() {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
}

// قوائم Radix (قائمة الحساب) تحتاج هذي، وjsdom ما يوفرها
if (typeof window.ResizeObserver === "undefined") {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// الحركات (HeroScanAnimation و DehmScan) تسأل عن تقليل الحركة وظهور العنصر
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });
}

if (typeof window.IntersectionObserver === "undefined") {
  window.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// صفحة الأدمن ترجع لأعلى الصفحة عند تغيير الصفحة؛ jsdom ما ينفذ التمرير
window.scrollTo = () => {};

// قائمة الترتيب (Radix Select) تستخدم pointer capture، وjsdom ما يوفرها
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}

// أي طلب ما له رد وهمي يفشّل الاختبار، عشان ما يروح طلب للخادم الحقيقي بالغلط
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  server.resetHandlers();
  sessionStorage.clear();
  localStorage.clear();
  document.body.style.overflow = "";
});

afterAll(() => server.close());
