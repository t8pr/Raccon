import { z } from "zod";
import i18n from "../../i18n";
// الرسائل هنا مفاتيح ترجمة؛ validateForm يترجمها حسب اللغة الحالية
// القواعد المشتركة

const nameSchema = z
  .string()
  .trim()
  .min(1, "validation.nameRequired")
  .max(30, "validation.nameMax");

const usernameSchema = z
  .string()
  .trim()
  .min(1, "validation.usernameRequired")
  .min(3, "validation.usernameMin")
  .max(20, "validation.usernameMax")
  .regex(/^[a-z0-9_]+$/, "validation.usernameFormat");

// نفس صيغة التحقق الموجودة عندك، حتى لا نغيّر
// أنواع عناوين البريد المقبولة بإضافة Zod.
const emailSchema = z
  .string()
  .trim()
  .min(1, "validation.emailRequired")
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "validation.emailInvalid");

const phoneSchema = z
  .string()
  .trim()
  .min(1, "validation.phoneRequired")
  .regex(/^5\d{8}$/, "validation.phoneInvalid");

// لا نستخدم trim مع كلمات المرور.
const newPasswordSchema = z
  .string()
  .min(1, "validation.passwordRequired")
  .refine(
    (value) => value.length >= 8,
    "validation.passwordMin",
  )
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "validation.passwordMaxBytes",
  );

const avatarSchema = z.custom(
  (value) => Number.isInteger(value) && [1, 2, 3, 4].includes(value),
  {
    message: "validation.avatarRequired",
  },
);

// التسجيل
// تحقق كلمات المرور مستقل عن حقول معلومات الحساب.
const registerPasswordsSchema = z
  .object({
    password: newPasswordSchema,

    confirmPassword: z.string().min(1, "validation.confirmPasswordRequired"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "validation.passwordsMismatch",
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
  .min(1, "validation.identifierRequired")
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
  password: z.string().min(8, "validation.loginPasswordMin"),
});

// تعديل البروفايل

const changePasswordSchema = z
  .object({
    old_password: z.string().min(1, "validation.oldPasswordRequired"),

    new_password: newPasswordSchema,

    confirmation: z.string().min(1, "validation.confirmNewPasswordRequired"),
  })
  .refine((values) => values.new_password === values.confirmation, {
    message: "validation.confirmationMismatch",
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
        confirmation: z.string().min(1, "validation.deleteConfirmRequired"),
      })
      .refine((values) => values.confirmation === username, {
        message: "validation.deleteConfirmMismatch",
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
      errors[field] = i18n.t(issue.message);
    }
  }

  return {
    success: false,
    data: null,
    errors,
  };
}

// رمز الاستلام الحالي يولّده الباك بصيغة URL-safe
export const claimHashSchema = z
  .string()
  .min(1, "validation.claimHashRequired")
  .regex(/^[A-Za-z0-9_-]+$/, "validation.claimHashInvalid");

export const claimRequestSchema = z.object({
  master_auth_hash: claimHashSchema,
});

// نسمح بالرجوع إلى صفحة الاستلام فقط
export const claimReturnSchema = z.object({
  path: z.string().regex(/^\/claim\/[A-Za-z0-9_-]+$/),
  createdAt: z.number().int().nonnegative(),
});
