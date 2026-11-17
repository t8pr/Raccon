import { describe, expect, test } from "vitest";
import {
  claimHashSchema,
  getProfileSchema,
  loginSchema,
  registerSchema,
  validateForm,
} from "./validation";

const validRegister = {
  name: "  عبدالرحمن  ",
  username: "abdu_1",
  email: " abdu@example.com ",
  phone_number: "512345678",
  password: "secret123",
  confirmPassword: "secret123",
};

// أول رسالة خطأ لحقل واحد
const errorFor = (schema, values, field) => validateForm(schema, values).errors[field];

describe("registerSchema", () => {
  test("بيانات صحيحة: يقص المسافات ويضيف الشخصية الافتراضية ويحذف التأكيد", () => {
    expect(validateForm(registerSchema, validRegister)).toEqual({
      success: true,
      errors: {},
      data: {
        name: "عبدالرحمن",
        username: "abdu_1",
        email: "abdu@example.com",
        phone_number: "512345678",
        password: "secret123",
        avatar_id: 1,
      },
    });
  });

  test.each([
    ["", "اختر اسم مستخدم."],
    ["ab", "اسم المستخدم يجب أن يحتوي على 3 أحرف على الأقل."],
    ["a".repeat(21), "اسم المستخدم يجب ألا يتجاوز 20 حرفا"],
    ["Abdu", "استخدم حروفًا إنجليزية صغيرة أو أرقامًا أو _ فقط."],
    ["ab-cd", "استخدم حروفًا إنجليزية صغيرة أو أرقامًا أو _ فقط."],
  ])("اسم المستخدم %j", (username, message) => {
    expect(errorFor(registerSchema, { ...validRegister, username }, "username")).toBe(message);
  });

  test.each([
    ["", "أدخل اسمك"],
    ["   ", "أدخل اسمك"],
    ["ا".repeat(31), "الأسم يجب ألا يتجاوز 30 حرفا"],
  ])("الاسم %j", (name, message) => {
    expect(errorFor(registerSchema, { ...validRegister, name }, "name")).toBe(message);
  });

  test.each([
    ["", "أدخل بريدك الإلكتروني."],
    ["abdu", "أدخل بريدًا إلكترونيًا صحيحًا."],
    ["abdu@mail", "أدخل بريدًا إلكترونيًا صحيحًا."],
  ])("البريد %j", (email, message) => {
    expect(errorFor(registerSchema, { ...validRegister, email }, "email")).toBe(message);
  });

  test.each(["", "0512345678", "412345678", "51234567", "5123456789", "5123abcde"])(
    "الجوال %j مرفوض",
    (phone_number) => {
      expect(
        errorFor(registerSchema, { ...validRegister, phone_number }, "phone_number"),
      ).toBeTruthy();
    },
  );

  test("كلمة مرور قصيرة", () => {
    expect(
      errorFor(registerSchema, { ...validRegister, password: "short", confirmPassword: "short" }, "password"),
    ).toBe("كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل.");
  });

  test("الحد 72 بايت وليس 72 حرف (الحرف العربي بايتين)", () => {
    const arabic = "ب".repeat(37); // 37 حرف = 74 بايت

    expect(
      errorFor(registerSchema, { ...validRegister, password: arabic, confirmPassword: arabic }, "password"),
    ).toBe("كلمة المرور طويلة جدًا. الحد الأقصى 72 بايت.");
  });

  test("كلمة المرور ما تنقص مسافاتها", () => {
    const spaced = " secret123 ";
    const result = validateForm(registerSchema, {
      ...validRegister,
      password: spaced,
      confirmPassword: spaced,
    });

    expect(result.data.password).toBe(spaced);
  });

  test("عدم تطابق التأكيد يظهر تحت حقل التأكيد", () => {
    expect(
      errorFor(registerSchema, { ...validRegister, confirmPassword: "other1234" }, "confirmPassword"),
    ).toBe("كلمتا المرور غير متطابقتين.");
  });
});

describe("loginSchema", () => {
  test("يقبل اسم مستخدم أو بريد", () => {
    expect(validateForm(loginSchema, { identifier: "abdu", password: "12345678" }).success).toBe(true);
    expect(validateForm(loginSchema, { identifier: "a@b.co", password: "12345678" }).success).toBe(true);
  });

  test("وجود @ يعني يتحقق كبريد", () => {
    expect(errorFor(loginSchema, { identifier: "abdu@", password: "12345678" }, "identifier")).toBe(
      "أدخل بريدًا إلكترونيًا صحيحًا.",
    );
  });

  test("بدون @ يتحقق كاسم مستخدم", () => {
    expect(errorFor(loginSchema, { identifier: "AB", password: "12345678" }, "identifier")).toBe(
      "اسم المستخدم يجب أن يحتوي على 3 أحرف على الأقل.",
    );
  });

  test("حقول فاضية", () => {
    expect(validateForm(loginSchema, { identifier: " ", password: "" }).errors).toEqual({
      identifier: "أدخل اسم المستخدم أو البريد الإلكتروني.",
      password: "أدخل 8 أحرف أو اكثر",
    });
  });
});

describe("getProfileSchema", () => {
  test("الحقول المنفردة", () => {
    expect(validateForm(getProfileSchema("name"), { name: " نورة " }).data).toEqual({ name: "نورة" });
    expect(validateForm(getProfileSchema("username"), { username: "Bad" }).success).toBe(false);
    expect(validateForm(getProfileSchema("phone_number"), { phone_number: "512345678" }).success).toBe(true);
  });

  test.each([1, 4])("الشخصية %i مقبولة", (avatar_id) => {
    expect(validateForm(getProfileSchema("avatar"), { avatar_id }).success).toBe(true);
  });

  test.each([0, 5, "2", 1.5, null])("الشخصية %j مرفوضة", (avatar_id) => {
    expect(validateForm(getProfileSchema("avatar"), { avatar_id }).errors.avatar_id).toBe(
      "اختر صورة رمزية للمتابعة.",
    );
  });

  test("تغيير كلمة المرور يرسل القديمة والجديدة فقط", () => {
    const result = validateForm(getProfileSchema("password"), {
      old_password: "old",
      new_password: "newpass123",
      confirmation: "newpass123",
    });

    expect(result.data).toEqual({ old_password: "old", new_password: "newpass123" });
  });

  test("تأكيد كلمة المرور الجديدة غير مطابق", () => {
    expect(
      errorFor(
        getProfileSchema("password"),
        { old_password: "old", new_password: "newpass123", confirmation: "x" },
        "confirmation",
      ),
    ).toBe("تأكيد كلمة المرور غير مطابق.");
  });

  test("حذف الحساب يحتاج كتابة اسم المستخدم نفسه", () => {
    const schema = getProfileSchema("delete", "abdu");

    expect(validateForm(schema, { confirmation: "abdu" }).success).toBe(true);
    expect(validateForm(schema, { confirmation: "other" }).errors.confirmation).toBe(
      "اسم المستخدم غير مطابق.",
    );
    expect(validateForm(schema, { confirmation: "" }).errors.confirmation).toBe(
      "اكتب اسم المستخدم لتأكيد الحذف.",
    );
  });
});

describe("validateForm", () => {
  test("يرجع أول رسالة لكل حقل فقط", () => {
    // "" يكسر 3 قواعد في اسم المستخدم، والمعروض الأولى
    expect(errorFor(registerSchema, { ...validRegister, username: "" }, "username")).toBe(
      "اختر اسم مستخدم.",
    );
  });

  test("عند الفشل data تكون null", () => {
    expect(validateForm(loginSchema, {}).data).toBeNull();
  });
});

describe("claimHashSchema", () => {
  test.each(["abc", "A-b_9"])("%s مقبول", (hash) => {
    expect(claimHashSchema.safeParse(hash).success).toBe(true);
  });

  test.each(["", "a b", "a/b", "a.b", "<x>"])("%j مرفوض", (hash) => {
    expect(claimHashSchema.safeParse(hash).success).toBe(false);
  });
});
