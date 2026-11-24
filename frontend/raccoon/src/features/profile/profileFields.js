// تعريفات صفحة الحساب: الحقول، العناوين، والقيم الابتدائية لكل نافذة تعديل.
import i18n from "../../i18n";

// كائن قيمه تنقرا من الترجمة وقت الاستخدام (حسب اللغة الحالية)
function translatedLabels(keys) {
  const labels = {};
  for (const [field, key] of Object.entries(keys)) {
    Object.defineProperty(labels, field, {
      enumerable: true,
      get: () => i18n.t(key),
    });
  }
  return labels;
}

// الحقول النصية التي يمكن تعديلها منفردة.
export const FIELD_LABELS = translatedLabels({
  name: "profile.fields.name",
  username: "profile.fields.username",
  phone_number: "profile.fields.phone",
});

export const FIELD_MAX_LENGTH = { name: 30, username: 20, phone_number: 9 };

// عنوان النافذة حسب نوع التعديل.
export const DIALOG_TITLES = translatedLabels({
  avatar: "profile.dialog.avatar",
  name: "profile.dialog.name",
  username: "profile.dialog.username",
  phone_number: "profile.dialog.phone",
  password: "profile.dialog.password",
  delete: "profile.dialog.delete",
});

// ترتيب صفوف معلومات الحساب.
export const INFORMATION_ROWS = [
  "name",
  "username",
  "email",
  "phone_number",
  "password",
];

// حقول نافذة تغيير كلمة المرور: [الحقل، مفتاح الترجمة]
export const PASSWORD_FIELDS = [
  ["old_password", "profile.fields.oldPassword"],
  ["new_password", "auth.fields.newPassword"],
  ["confirmation", "auth.fields.confirmPassword"],
];

// القيم التي تبدأ بها النافذة عند فتحها
export function getInitialDraft(field, user) {
  if (field === "avatar") {
    return { avatar_id: Number(user.avatar_id) || 1 };
  }

  if (field === "password") {
    return { old_password: "", new_password: "", confirmation: "" };
  }

  if (field === "delete") {
    return { confirmation: "" };
  }

  return { [field]: user[field] || "" };
}

// النص المعروض في صف «معلوماتي»
export function getDisplayValue(field, user) {
  if (field === "password") {
    return "••••••••";
  }

  if (field === "phone_number") {
    return `+966 ${user.phone_number}`;
  }

  return user[field];
}

export function getRowLabel(field) {
  return (
    FIELD_LABELS[field] ||
    i18n.t(field === "email" ? "auth.fields.email" : "auth.fields.password")
  );
}

// رسالة الخطأ حسب رد الخادم ونوع التعديل.
// الخادم يرجع 400 لأكثر من سبب، فنفس الرقم يعني شي مختلف حسب النافذة:
//   password  → "Incorrect old password"
//   username  → "Username is already taken"
export function getRequestErrorMessage(requestError, kind) {
  const { status } = requestError;

  if (status === 401) {
    return i18n.t("profile.errors.sessionExpired");
  }

  if (kind === "password" && (status === 400 || status === 409)) {
    return i18n.t("profile.errors.wrongPassword");
  }

  if (kind === "username" && (status === 400 || status === 409)) {
    return i18n.t("profile.errors.usernameTaken");
  }

  return i18n.t("profile.errors.generic");
}
