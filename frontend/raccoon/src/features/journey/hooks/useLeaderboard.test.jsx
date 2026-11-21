import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { renderHookWithProviders } from "../../../test/renderWithProviders";
import { useLeaderboard } from "./useLeaderboard";

const players = [
  { username: "noura", score: 12 },
  { username: "abdu", score: 9 },
];

function countRequests(response = HttpResponse.json(players)) {
  const calls = [];
  server.use(
    http.get(`${API}/journey/leaderboard/:eventId`, ({ params }) => {
      calls.push(params.eventId);
      return response.clone();
    }),
  );
  return calls;
}

test("يجلب المتصدرين للجولة", async () => {
  const calls = countRequests();

  const { result } = renderHookWithProviders(() => useLeaderboard("e1", "scan-1"));

  await waitFor(() => expect(result.current.players).toEqual(players));
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBe("");
  expect(calls).toEqual(["e1"]);
});

test("بدون جولة ما يرسل طلب", async () => {
  const calls = countRequests();

  const { result } = renderHookWithProviders(() => useLeaderboard(null, "x"));

  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(calls).toEqual([]);
  expect(result.current.loading).toBe(false);
});

test("فشل الجلب: رسالة خطأ", async () => {
  countRequests(HttpResponse.json({}, { status: 500 }));

  const { result } = renderHookWithProviders(() => useLeaderboard("e1", "x"));

  await waitFor(() => expect(result.current.error).toBe("تعذر تحميل المتصدرين."));
  expect(result.current.players).toEqual([]);
});

test("تغيّر refreshKey يعيد التحميل", async () => {
  const calls = countRequests();

  const { result, rerender } = renderHookWithProviders(({ key }) => useLeaderboard("e1", key), {
    initialProps: { key: "scan-1" },
  });

  await waitFor(() => expect(result.current.players).toEqual(players));
  rerender({ key: "scan-2" });

  await waitFor(() => expect(calls).toHaveLength(2));
});
