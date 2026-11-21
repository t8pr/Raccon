import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";

import { server } from "../../test/server";
import { API } from "../../test/handlers";
import { testUser } from "../../test/fixtures";
import {
  TEST_TOKEN,
  renderHookWithProviders,
  waitForSignIn,
} from "../../test/renderWithProviders";
import { queryKeys } from "../constants/queryKeys";
import { useAuth } from "./AuthContext";
import { getToken } from "./tokenStore";

test("useAuth خارج AuthProvider يرمي خطأ واضح", () => {
  expect(() => renderHook(() => useAuth())).toThrow(
    "useAuth must be used within AuthProvider",
  );
});

describe("استعادة الجلسة", () => {
  test("بتوكن محفوظ: يجيب الحساب ويرسل التوكن", async () => {
    let auth;
    server.use(
      http.get(`${API}/users/me`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json(testUser);
      }),
    );

    const { result } = renderHookWithProviders(() => useAuth());

    expect(result.current.isRestoring).toBe(true);
    await waitFor(() => expect(result.current.user).toEqual(testUser));
    expect(result.current.isRestoring).toBe(false);
    expect(result.current.accessToken).toBe(TEST_TOKEN);
    expect(auth).toBe(`Bearer ${TEST_TOKEN}`);
  });

  test("بدون توكن: زائر بدون أي طلب", () => {
    const { result } = renderHookWithProviders(() => useAuth(), {
      token: null,
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isRestoring).toBe(false);
    expect(result.current.restoreError).toBe("");
  });

  test.each([401, 403])("%i: يمسح الجلسة", async (status) => {
    server.use(
      http.get(`${API}/users/me`, () => HttpResponse.json({}, { status })),
    );

    const { result } = renderHookWithProviders(() => useAuth());

    await waitFor(() => expect(result.current.accessToken).toBeNull());
    expect(getToken()).toBeNull();
    expect(result.current.restoreError).toBe("");
  });

  test("خطأ ثاني: restoreError ويبقى التوكن", async () => {
    server.use(
      http.get(`${API}/users/me`, () => HttpResponse.json({}, { status: 503 })),
    );

    const { result } = renderHookWithProviders(() => useAuth());

    await waitFor(() =>
      expect(result.current.restoreError).toBe(
        "تعذر التحقق من جلسة الدخول. حاول مرة أخرى.",
      ),
    );
    expect(result.current.accessToken).toBe(TEST_TOKEN);
    expect(result.current.user).toBeNull();
  });
});

test("signIn: يحفظ التوكن والحساب بدون طلب جديد", async () => {
  let requests = 0;
  server.use(
    http.get(`${API}/users/me`, () => {
      requests += 1;
      return HttpResponse.json(testUser);
    }),
  );
  const { result, queryClient } = renderHookWithProviders(() => useAuth(), {
    token: null,
  });

  act(() => result.current.signIn("new-token", testUser));

  expect(getToken()).toBe("new-token");
  expect(result.current.user).toEqual(testUser);
  expect(queryClient.getQueryData(queryKeys.profile("new-token"))).toEqual(
    testUser,
  );
  expect(requests).toBe(0);
});

test("clearSession: يمسح التوكن والحساب", async () => {
  const { result, queryClient } = renderHookWithProviders(() => useAuth());
  await waitForSignIn(queryClient);

  act(() => result.current.clearSession());

  expect(getToken()).toBeNull();
  expect(result.current.user).toBeNull();
  expect(
    queryClient.getQueryData(queryKeys.profile(TEST_TOKEN)),
  ).toBeUndefined();
});

test("updateUser: يحدّث الحساب في الكاش", async () => {
  const { result, queryClient } = renderHookWithProviders(() => useAuth());
  await waitForSignIn(queryClient);

  await act(() => result.current.updateUser({ ...testUser, name: "نورة" }));

  // TanStack Query يبلّغ المكوّنات في الدورة التالية
  await waitFor(() => expect(result.current.user.name).toBe("نورة"));
});

test("markAccountDeleted: يمسح التوكن المحفوظ ويخلي المستخدم لين يقفل النافذة", async () => {
  const { result, queryClient } = renderHookWithProviders(() => useAuth());
  await waitForSignIn(queryClient);

  await act(() => result.current.markAccountDeleted());

  // لو حدّث الصفحة يطلع، لأن التوكن انمسح من التخزين
  expect(getToken()).toBeNull();
  // بس الصفحة الحالية تبقى عشان نافذة «تم حذف حسابك»
  expect(result.current.user).toEqual(testUser);

  // إغلاق النافذة يستدعي clearSession
  act(() => result.current.clearSession());
  expect(result.current.user).toBeNull();
  expect(result.current.accessToken).toBeNull();
});
