import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import arCommon from "./locales/ar/common.json";
import arValidation from "./locales/ar/validation.json";
import arApi from "./locales/ar/api.json";
import arAuth from "./locales/ar/auth.json";
import arHome from "./locales/ar/home.json";
import arPackages from "./locales/ar/packages.json";
import arStore from "./locales/ar/store.json";
import arClaim from "./locales/ar/claim.json";
import arCustomization from "./locales/ar/customization.json";
import arJourney from "./locales/ar/journey.json";
import arProfile from "./locales/ar/profile.json";
import arAdmin from "./locales/ar/admin.json";

import enCommon from "./locales/en/common.json";
import enValidation from "./locales/en/validation.json";
import enApi from "./locales/en/api.json";
import enAuth from "./locales/en/auth.json";
import enHome from "./locales/en/home.json";
import enPackages from "./locales/en/packages.json";
import enStore from "./locales/en/store.json";
import enClaim from "./locales/en/claim.json";
import enCustomization from "./locales/en/customization.json";
import enJourney from "./locales/en/journey.json";
import enProfile from "./locales/en/profile.json";
import enAdmin from "./locales/en/admin.json";

// كل ملف feature يصير قسم باسمه: auth.json → t("auth.…")
// ما عدا common.json: مفاتيحه في الجذر (nav, common, language …)
const ar = {
  ...arCommon,
  validation: arValidation,
  api: arApi,
  auth: arAuth,
  home: arHome,
  packages: arPackages,
  store: arStore,
  claim: arClaim,
  customization: arCustomization,
  journey: arJourney,
  profile: arProfile,
  admin: arAdmin,
};

const en = {
  ...enCommon,
  validation: enValidation,
  api: enApi,
  auth: enAuth,
  home: enHome,
  packages: enPackages,
  store: enStore,
  claim: enClaim,
  customization: enCustomization,
  journey: enJourney,
  profile: enProfile,
  admin: enAdmin,
};

i18n
  .use(LanguageDetector) // يكتشف اللغة ويحفظها في localStorage
  .use(initReactI18next) // يربط i18next مع React
  .init({
    resources: { ar: { translation: ar }, en: { translation: en } },
    fallbackLng: "ar", // إذا ما لقى ترجمة يرجع للعربي
    supportedLngs: ["ar", "en"],
    nonExplicitSupportedLngs: true, // en-US → en ، ar-SA → ar
    interpolation: { escapeValue: false }, // React يحمي من XSS أصلًا
    detection: {
      order: ["localStorage", "navigator"], // اختيار المستخدم أولًا، ثم لغة المتصفح
      caches: ["localStorage"],
    },
  });

// يغيّر lang و dir في وسم <html> حسب اللغة
function applyDirection() {
  const lng = i18n.resolvedLanguage || "ar";
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
}
applyDirection();
i18n.on("languageChanged", applyDirection);

export default i18n;
