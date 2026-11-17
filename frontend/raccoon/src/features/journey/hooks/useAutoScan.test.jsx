import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { renderHookWithProviders } from "../../../test/renderWithProviders";
import { useAutoScan } from "./useAutoScan";

// يسجل كل طلب مسح وصل للخادم
function onScan(response) {
  const bodies = [];
  server.use(
    http.post(`${API}/journey/scan`, async ({ request }) => {
      bodies.push(await request.json());
      return response.clone();
    }),
  );
  return bodies;
}

const clue = { status: "success", tag_type: "clue", content: { hint: "تحت الكرسي" }, score: 3 };

test("رابط ناقص: خطأ بدون أي طلب", async () => {
  const bodies = onScan(HttpResponse.json(clue));

  const { result } = renderHookWithProviders(() => useAutoScan("abc", null));

  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.error).toBe("رابط غير صالح أو بيانات مفقودة.");
  expect(bodies).toEqual([]);
});

test("مسح ناجح: يرسل القطعة واللاعب ويرجع النتيجة", async () => {
  const bodies = onScan(HttpResponse.json(clue));

  const { result } = renderHookWithProviders(() => useAutoScan("tag1", "user1"));

  await waitFor(() => expect(result.current.scanResult).toEqual(clue));
  expect(result.current.isLoading).toBe(false);
  expect(result.current.scanError).toBeNull();
  expect(bodies).toEqual([{ tag_hash: "tag1", injected_user_hash: "user1" }]);
});

describe("أخطاء المسح", () => {
  test("detail بكود من الخادم", async () => {
    const detail = { code: "freeze", message: "Frozen", remaining_seconds: 40 };
    onScan(HttpResponse.json({ detail }, { status: 400 }));

    const { result } = renderHookWithProviders(() => useAutoScan("tag1", "user1"));

    await waitFor(() => expect(result.current.scanError).toEqual(detail));
    expect(result.current.scanResult).toBeNull();
  });

  test("detail نصي", async () => {
    onScan(HttpResponse.json({ detail: "This event is not live." }, { status: 400 }));

    const { result } = renderHookWithProviders(() => useAutoScan("tag1", "user1"));

    await waitFor(() =>
      expect(result.current.scanError).toEqual({ code: "unknown", message: "This event is not live." }),
    );
  });
});

test("StrictMode: المسح يتسجل مرة وحدة بس (يغيّر النقاط في الخادم)", async () => {
  const bodies = onScan(HttpResponse.json(clue));

  const { result } = renderHookWithProviders(() => useAutoScan("tag1", "user1"), { strict: true });

  await waitFor(() => expect(result.current.scanResult).toEqual(clue));
  expect(bodies).toHaveLength(1);
});

test("بدون توكن ينتظر وما يرسل طلب", async () => {
  const bodies = onScan(HttpResponse.json(clue));

  const { result } = renderHookWithProviders(() => useAutoScan("tag1", "user1"), { token: null });

  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(result.current.isLoading).toBe(true);
  expect(bodies).toEqual([]);
});

test("markTrapSet يحدّث النتيجة بدون مسح جديد", async () => {
  const choose = { status: "choose_trap", tag_type: "trap", content: { choose: true } };
  const bodies = onScan(HttpResponse.json(choose));

  const { result } = renderHookWithProviders(() => useAutoScan("tag1", "user1"));
  await waitFor(() => expect(result.current.scanResult).toEqual(choose));

  act(() => result.current.markTrapSet({ content: { freeze: 30 } }));

  expect(result.current.scanResult).toEqual({
    status: "trap_set",
    tag_type: "trap",
    content: { freeze: 30 },
  });
  expect(bodies).toHaveLength(1);
});
