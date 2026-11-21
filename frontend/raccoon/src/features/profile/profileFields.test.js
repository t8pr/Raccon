import { describe, expect, test } from "vitest";
import {
  INFORMATION_ROWS,
  getDisplayValue,
  getInitialDraft,
  getRequestErrorMessage,
  getRowLabel,
} from "./profileFields";

const user = {
  name: "عبدالرحمن",
  username: "abdu",
  email: "abdu@example.com",
  phone_number: "512345678",
  avatar_id: 3,
};

describe("getInitialDraft", () => {
  test("الحقول النصية تبدأ بالقيمة الحالية", () => {
    expect(getInitialDraft("name", user)).toEqual({ name: "عبدالرحمن" });
    expect(getInitialDraft("phone_number", user)).toEqual({ phone_number: "512345678" });
    expect(getInitialDraft("username", { ...user, username: null })).toEqual({ username: "" });
  });

  test("الشخصية رقم، والقيمة الغلط ترجع 1", () => {
    expect(getInitialDraft("avatar", user)).toEqual({ avatar_id: 3 });
    expect(getInitialDraft("avatar", { ...user, avatar_id: "4" })).toEqual({ avatar_id: 4 });
    expect(getInitialDraft("avatar", { ...user, avatar_id: null })).toEqual({ avatar_id: 1 });
  });

  test("كلمة المرور والحذف يبدأون فاضيين", () => {
    expect(getInitialDraft("password", user)).toEqual({
      old_password: "",
      new_password: "",
      confirmation: "",
    });
    expect(getInitialDraft("delete", user)).toEqual({ confirmation: "" });
  });
});

describe("صفوف معلوماتي", () => {
  test("الترتيب", () => {
    expect(INFORMATION_ROWS).toEqual(["name", "username", "email", "phone_number", "password"]);
  });

  test("القيم المعروضة", () => {
    expect(getDisplayValue("name", user)).toBe("عبدالرحمن");
    expect(getDisplayValue("phone_number", user)).toBe("+966 512345678");
    expect(getDisplayValue("password", user)).toBe("••••••••");
  });

  test("العناوين", () => {
    expect(INFORMATION_ROWS.map(getRowLabel)).toEqual([
      "الاسم",
      "اسم المستخدم",
      "الإيميل",
      "رقم الجوال",
      "كلمة المرور",
    ]);
  });
});

describe("getRequestErrorMessage", () => {
  const WRONG_PASSWORD = "كلمة المرور الحالية غير صحيحة.";
  const USERNAME_TAKEN = "اسم المستخدم مستخدم من قبل. اختر اسمًا آخر.";
  const GENERIC = "تعذر تنفيذ الطلب. حاول مرة أخرى.";

  test.each(["name", "username", "password", "delete"])("401 في %s: انتهت الجلسة", (kind) => {
    expect(getRequestErrorMessage({ status: 401 }, kind)).toBe(
      "انتهت جلسة الدخول. سجّل الدخول مجددًا.",
    );
  });

  test.each([400, 409])("كلمة المرور الحالية غلط (%i من change-password)", (status) => {
    expect(getRequestErrorMessage({ status, detail: "Incorrect old password" }, "password")).toBe(
      WRONG_PASSWORD,
    );
  });

  // كان خطأ: أي 400 يظهر كخطأ كلمة مرور، حتى لو المشكلة اسم مستخدم مأخوذ
  test.each([400, 409])("اسم مستخدم مأخوذ (%i) ما يظهر كخطأ كلمة مرور", (status) => {
    expect(
      getRequestErrorMessage({ status, detail: "Username is already taken" }, "username"),
    ).toBe(USERNAME_TAKEN);
  });

  test.each(["name", "phone_number", "avatar", "delete"])(
    "400 في %s رسالة عامة، مو كلمة مرور",
    (kind) => {
      expect(getRequestErrorMessage({ status: 400 }, kind)).toBe(GENERIC);
    },
  );

  test("أي خطأ ثاني رسالة عامة", () => {
    expect(getRequestErrorMessage({ status: 500 }, "password")).toBe(GENERIC);
    expect(getRequestErrorMessage({ status: 500 }, "username")).toBe(GENERIC);
  });
});
