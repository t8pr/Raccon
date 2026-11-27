import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";

import { server } from "../../../test/server";
import { API, sseResponse } from "../../../test/handlers";
import { renderHookWithProviders } from "../../../test/renderWithProviders";
import { useLeaderboard } from "./useLeaderboard";

const ME = "me-hash";

// لاعبين بترتيبهم: player(1) ... player(10)
const player = (rank, overrides = {}) => ({
  user_hash: `u${rank}`,
  name: `لاعب ${rank}`,
  avatar_id: 1,
  score: 40 - rank,
  rank,
  ...overrides,
});
const topTen = Array.from({ length: 10 }, (_, index) => player(index + 1));

// الـ GET: الخادم يرجّع أول 10، وصفّي آخرهم لو أنا برا العشرة
function serveLeaderboard(response) {
  const calls = [];
  server.use(
    http.get(`${API}/journey/leaderboard/:eventId`, ({ params }) => {
      calls.push(params.eventId);
      return response.clone();
    }),
  );
  return calls;
}

test("يجلب أول 10، وصفّي آخرهم لو أنا برا العشرة", async () => {
  const me = player(14, { user_hash: ME });
  const calls = serveLeaderboard(HttpResponse.json([...topTen, me]));

  const { result } = renderHookWithProviders(() => useLeaderboard("e1", ME));

  await waitFor(() => expect(result.current.top).toEqual(topTen));
  expect(result.current.me).toEqual(me);
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBe("");
  expect(calls).toEqual(["e1"]);
});

test("لو أنا من العشرة: صفّي من القائمة نفسها", async () => {
  const list = topTen.map((item) =>
    item.rank === 3 ? { ...item, user_hash: ME } : item,
  );
  serveLeaderboard(HttpResponse.json(list));

  const { result } = renderHookWithProviders(() => useLeaderboard("e1", ME));

  await waitFor(() => expect(result.current.top).toHaveLength(10));
  expect(result.current.me).toMatchObject({ user_hash: ME, rank: 3 });
});

test("ما لعبت: me = null", async () => {
  serveLeaderboard(HttpResponse.json(topTen));

  const { result } = renderHookWithProviders(() => useLeaderboard("e1", ME));

  await waitFor(() => expect(result.current.top).toHaveLength(10));
  expect(result.current.me).toBeNull();
});

test("بدون جولة ما يرسل طلب", async () => {
  const calls = serveLeaderboard(HttpResponse.json(topTen));

  const { result } = renderHookWithProviders(() => useLeaderboard(null, ME));

  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(calls).toEqual([]);
  expect(result.current.loading).toBe(false);
  expect(result.current.top).toEqual([]);
});

test("فشل الجلب: رسالة خطأ", async () => {
  serveLeaderboard(HttpResponse.json({}, { status: 500 }));

  const { result } = renderHookWithProviders(() => useLeaderboard("e1", ME));

  await waitFor(() =>
    expect(result.current.error).toBe("تعذر تحميل المتصدرين."),
  );
  expect(result.current.top).toEqual([]);
  expect(result.current.me).toBeNull();
});

test("البث: «leaderboard» يحدّث العشرة، و«player» يحدّث صفّي", async () => {
  serveLeaderboard(
    HttpResponse.json([...topTen, player(14, { user_hash: ME })]),
  );

  // بعد ما أحد مسح: نورة صارت الأولى، وأنا طلعت 12
  const newTop = [player(1, { name: "نورة" }), ...topTen.slice(1)];
  const myNewRow = player(12, { user_hash: ME, score: 20 });
  server.use(
    http.get(`${API}/journey/leaderboard/:eventId/stream`, ({ request }) => {
      expect(request.headers.get("Authorization")).toBe("Bearer test-token");
      return sseResponse(
        [
          { event: "leaderboard", data: newTop },
          { event: "player", data: myNewRow },
        ],
        100,
      );
    }),
  );

  const { result } = renderHookWithProviders(() => useLeaderboard("e1", ME));

  await waitFor(() => expect(result.current.top[0].name).toBe("نورة"));
  await waitFor(() => expect(result.current.me).toEqual(myNewRow));
});

test("البث: لو دخلت العشرة ناخذ صفّي من «leaderboard»", async () => {
  serveLeaderboard(
    HttpResponse.json([...topTen, player(14, { user_hash: ME })]),
  );

  const newTop = topTen.map((item) =>
    item.rank === 2 ? { ...item, user_hash: ME } : item,
  );
  server.use(
    http.get(`${API}/journey/leaderboard/:eventId/stream`, () =>
      sseResponse([{ event: "leaderboard", data: newTop }], 100),
    ),
  );

  const { result } = renderHookWithProviders(() => useLeaderboard("e1", ME));

  await waitFor(() =>
    expect(result.current.me).toMatchObject({ user_hash: ME, rank: 2 }),
  );
});
