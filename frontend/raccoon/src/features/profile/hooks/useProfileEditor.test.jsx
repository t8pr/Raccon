import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { testUser } from "../../../test/fixtures";
import { TEST_TOKEN, renderHookWithProviders, waitForSignIn } from "../../../test/renderWithProviders";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { getToken } from "../../../shared/auth/tokenStore";
import { useProfileEditor } from "./useProfileEditor";

const click = { currentTarget: document.body };
const submit = { preventDefault: () => {} };

async function renderEditor() {
  const view = renderHookWithProviders(() => useProfileEditor(), { route: "/profile" });
  await waitForSignIn(view.queryClient);
  return view;
}

// يفتح نافذة، يكتب القيم، ويحفظ
function openAndSave(result, field, values = {}) {
  act(() => result.current.open(field, click));

  for (const [key, value] of Object.entries(values)) {
    act(() => result.current.change(key)({ target: { value } }));
  }

  act(() => result.current.save(submit));
}

describe("فتح النافذة", () => {
  test("تبدأ بالقيمة الحالية", async () => {
    const { result } = await renderEditor();

    act(() => result.current.open("username", click));

    expect(result.current.editing).toBe("username");
    expect(result.current.draft).toEqual({ username: "abdu" });
  });

  test("setAvatar يختار الشخصية", async () => {
    const { result } = await renderEditor();
    act(() => result.current.open("avatar", click));

    act(() => result.current.setAvatar(2));

    expect(result.current.draft).toEqual({ avatar_id: 2 });
  });
});

test("بيانات غلط: أول رسالة بدون طلب", async () => {
  let requested = false;
  server.use(
    http.patch(`${API}/users/me`, () => {
      requested = true;
      return HttpResponse.json({});
    }),
  );
  const { result } = await renderEditor();

  openAndSave(result, "phone_number", { phone_number: "0512" });

  expect(result.current.error).toBe("أدخل رقم جوال سعودي صحيحًا من 9 أرقام يبدأ بـ 5.");
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(requested).toBe(false);
});

describe("الحفظ الناجح", () => {
  test("تعديل الحساب: يرسل التغيير ويحدّث الكاش ويقفل النافذة", async () => {
    let body;
    const updated = { ...testUser, username: "new_name" };
    server.use(
      http.patch(`${API}/users/me`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(updated);
      }),
    );
    const { result, queryClient } = await renderEditor();

    openAndSave(result, "username", { username: "new_name" });

    await waitFor(() => expect(result.current.notice).toBe("تم حفظ التغييرات."));
    expect(body).toEqual({ username: "new_name" });
    expect(queryClient.getQueryData(queryKeys.profile(TEST_TOKEN))).toEqual(updated);
    expect(result.current.editing).toBeNull();
    expect(result.current.error).toBe("");
  });

  test("كلمة المرور: ما يرسل التأكيد", async () => {
    let body;
    server.use(
      http.post(`${API}/auth/change-password`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ok: true });
      }),
    );
    const { result } = await renderEditor();

    openAndSave(result, "password", {
      old_password: "oldpass12",
      new_password: "newpass123",
      confirmation: "newpass123",
    });

    await waitFor(() => expect(result.current.notice).toBe("تم تغيير كلمة المرور."));
    expect(body).toEqual({ old_password: "oldpass12", new_password: "newpass123" });
  });
});

describe("رسائل الخطأ حسب نوع التعديل", () => {
  test("اسم مستخدم مأخوذ", async () => {
    server.use(
      http.patch(`${API}/users/me`, () =>
        HttpResponse.json({ detail: "Username is already taken" }, { status: 400 }),
      ),
    );
    const { result } = await renderEditor();

    openAndSave(result, "username", { username: "taken_name" });

    await waitFor(() =>
      expect(result.current.error).toBe("اسم المستخدم مستخدم من قبل. اختر اسمًا آخر."),
    );
    expect(result.current.editing).toBe("username");
  });

  test("كلمة المرور الحالية غلط", async () => {
    server.use(
      http.post(`${API}/auth/change-password`, () =>
        HttpResponse.json({ detail: "Incorrect old password" }, { status: 400 }),
      ),
    );
    const { result } = await renderEditor();

    openAndSave(result, "password", {
      old_password: "wrong",
      new_password: "newpass123",
      confirmation: "newpass123",
    });

    await waitFor(() => expect(result.current.error).toBe("كلمة المرور الحالية غير صحيحة."));
  });

  test("400 في الاسم رسالة عامة", async () => {
    server.use(http.patch(`${API}/users/me`, () => HttpResponse.json({}, { status: 400 })));
    const { result } = await renderEditor();

    openAndSave(result, "name", { name: "نورة" });

    await waitFor(() => expect(result.current.error).toBe("تعذر تنفيذ الطلب. حاول مرة أخرى."));
  });
});

describe("حذف الحساب", () => {
  test("لازم يكتب اسم المستخدم نفسه", async () => {
    const { result } = await renderEditor();

    openAndSave(result, "delete", { confirmation: "other" });

    expect(result.current.error).toBe("اسم المستخدم غير مطابق.");
  });

  test("بعد الحذف: deleted، والإغلاق يمسح الجلسة ويرجع للبداية", async () => {
    server.use(http.delete(`${API}/auth/delete-account`, () => HttpResponse.json({ ok: true })));
    const { result, location } = await renderEditor();

    openAndSave(result, "delete", { confirmation: "abdu" });

    await waitFor(() => expect(result.current.deleted).toBe(true));
    expect(getToken()).toBeNull();

    act(() => result.current.close());

    expect(location.current.pathname).toBe("/");
  });
});
