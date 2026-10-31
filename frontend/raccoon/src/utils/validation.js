import { z } from "zod";
// القواعد المشتركة

const nameSchema = z
  .string()
  .trim()
  .min(1, "أدخل اسمك")
  .max(30, "الأسم يجب ألا يتجاوز 30 حرفا");

const usernameSchema = z
  .string()
  .trim()
  .min(1, "اختر اسم مستخدم.")
  .min(3, "اسم المستخدم يجب أن يحتوي على 3 أحرف على الأقل.")
  .max(20, "اسم المستخدم يجب ألا يتجاوز 20 حرفا")
  .regex(/^[a-z0-9_]+$/, "استخدم حروفًا إنجليزية صغيرة أو أرقامًا أو _ فقط.");

// نفس صيغة التحقق الموجودة عندك، حتى لا نغيّر
// أنواع عناوين البريد المقبولة بإضافة Zod.
const emailSchema = z
  .string()
  .trim()
  .min(1, "أدخل بريدك الإلكتروني.")
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "أدخل بريدًا إلكترونيًا صحيحًا.");

const phoneSchema = z
  .string()
  .trim()
  .min(1, "أدخل رقم جوالك.")
  .regex(/^5\d{8}$/, "أدخل رقم جوال سعودي صحيحًا من 9 أرقام يبدأ بـ 5.");

// لا نستخدم trim مع كلمات المرور.
const newPasswordSchema = z
  .string()
  .min(1, "أدخل كلمة المرور.")
  .refine(
    (value) => value.length >= 8,
    "كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل.",
  )
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "كلمة المرور طويلة جدًا. الحد الأقصى 72 بايت.",
  );

const avatarSchema = z.custom(
  (value) => Number.isInteger(value) && [1, 2, 3, 4].includes(value),
  {
    message: "اختر صورة رمزية للمتابعة.",
  },
);

// التسجيل
// تحقق كلمات المرور مستقل عن حقول معلومات الحساب.
const registerPasswordsSchema = z
  .object({
    password: newPasswordSchema,

    confirmPassword: z.string().min(1, "أكد كلمة المرور."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين.",
    path: ["confirmPassword"],
  });

export const registerSchema = z
  .intersection(
    z.object({
      name: nameSchema,
      username: usernameSchema,
      email: emailSchema,
      phone_number: phoneSchema,
    }),
    registerPasswordsSchema,
  )
  .transform((values) => ({
    name: values.name,
    username: values.username,
    email: values.email,
    phone_number: values.phone_number,
    password: values.password,

    // شخصية افتراضية؛ يمكن تغييرها لاحقًا من البروفايل.
    avatar_id: 1,
  }));

// تسجيل الدخول

const identifierSchema = z
  .string()
  .trim()
  .min(1, "أدخل اسم المستخدم أو البريد الإلكتروني.")
  .superRefine((value, context) => {
    if (!value) return;

    const schema = value.includes("@") ? emailSchema : usernameSchema;

    const result = schema.safeParse(value);

    if (!result.success) {
      context.addIssue({
        code: "custom",
        message: result.error.issues[0].message,
      });
    }
  });

export const loginSchema = z.object({
  identifier: identifierSchema,

  // الدخول لا يفرض شروط إنشاء كلمة مرور جديدة.
  password: z.string().min(8, "أدخل 8 أحرف أو اكثر"),
});

// تعديل البروفايل

const changePasswordSchema = z
  .object({
    old_password: z.string().min(1, "أدخل كلمة المرور الحالية."),

    new_password: newPasswordSchema,

    confirmation: z.string().min(1, "أكد كلمة المرور الجديدة."),
  })
  .refine((values) => values.new_password === values.confirmation, {
    message: "تأكيد كلمة المرور غير مطابق.",
    path: ["confirmation"],
  })
  .transform((values) => ({
    // التأكيد لا يُرسل إلى الباك إند.
    old_password: values.old_password,
    new_password: values.new_password,
  }));

const profileSchemas = {
  name: z.object({
    name: nameSchema,
  }),

  username: z.object({
    username: usernameSchema,
  }),

  phone_number: z.object({
    phone_number: phoneSchema,
  }),

  avatar: z.object({
    avatar_id: avatarSchema,
  }),

  password: changePasswordSchema,
};

export function getProfileSchema(kind, username) {
  if (kind === "delete") {
    return z
      .object({
        confirmation: z.string().min(1, "اكتب اسم المستخدم لتأكيد الحذف."),
      })
      .refine((values) => values.confirmation === username, {
        message: "اسم المستخدم غير مطابق.",
        path: ["confirmation"],
      });
  }

  return profileSchemas[kind];
}

// تحويل نتيجة Zod للواجهة

export function validateForm(schema, values) {
  const result = schema.safeParse(values);

  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: {},
    };
  }

  const errors = {};

  for (const issue of result.error.issues) {
    const field = issue.path[0] ?? "form";

    // نعرض أول رسالة لكل حقل.
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  }

  return {
    success: false,
    data: null,
    errors,
  };
}
