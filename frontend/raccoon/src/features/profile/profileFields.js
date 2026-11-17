// تعريفات صفحة الحساب: الحقول، العناوين، والقيم الابتدائية لكل نافذة تعديل.

// الحقول النصية التي يمكن تعديلها منفردة.
export const FIELD_LABELS = {
  name: "الاسم",
  username: "اسم المستخدم",
  phone_number: "رقم الجوال",
};

export const FIELD_MAX_LENGTH = { name: 30, username: 20, phone_number: 9 };

// عنوان النافذة حسب نوع التعديل.
export const DIALOG_TITLES = {
  avatar: "غيّر شخصيتك",
  name: "تعديل الاسم",
  username: "تعديل اسم المستخدم",
  phone_number: "تعديل رقم الجوال",
  password: "تغيير كلمة المرور",
  delete: "حذف الحساب",
};

// ترتيب صفوف معلومات الحساب.
export const INFORMATION_ROWS = [
  "name",
  "username",
  "email",
  "phone_number",
  "password",
];

// حقول نافذة تغيير كلمة المرور.
export const PASSWORD_FIELDS = [
  ["old_password", "كلمة المرور الحالية"],
  ["new_password", "كلمة المرور الجديدة"],
  ["confirmation", "تأكيد كلمة المرور"],
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
  return FIELD_LABELS[field] || (field === "email" ? "الإيميل" : "كلمة المرور");
}

// رسالة الخطأ حسب رد الخادم ونوع التعديل.
// الخادم يرجع 400 لأكثر من سبب، فنفس الرقم يعني شي مختلف حسب النافذة:
//   password  → "Incorrect old password"
//   username  → "Username is already taken"
export function getRequestErrorMessage(requestError, kind) {
  const { status } = requestError;

  if (status === 401) {
    return "انتهت جلسة الدخول. سجّل الدخول مجددًا.";
  }

  if (kind === "password" && (status === 400 || status === 409)) {
    return "كلمة المرور الحالية غير صحيحة.";
  }

  if (kind === "username" && (status === 400 || status === 409)) {
    return "اسم المستخدم مستخدم من قبل. اختر اسمًا آخر.";
  }

  return "تعذر تنفيذ الطلب. حاول مرة أخرى.";
}
