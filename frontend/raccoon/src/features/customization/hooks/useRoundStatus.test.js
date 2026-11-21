import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test, vi } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { useRoundStatus } from "./useRoundStatus";

test.each(["live", "paused"])("تغيير الحالة إلى %s ثم إعادة الجلب", async (status) => {
  let body;
  server.use(
    http.patch(`${API}/events/e1`, async ({ request }) => {
      body = await request.json();
      return HttpResponse.json({ id: "e1", status });
    }),
  );
  const refetch = vi.fn().mockResolvedValue({});
  const { result } = renderHook(() => useRoundStatus({ eventId: "e1", refetch }));

  await act(() => result.current.changeStatus(status));

  expect(body).toEqual({ status });
  expect(refetch).toHaveBeenCalledTimes(1);
  expect(result.current.isStarting).toBe(false);
  expect(result.current.startError).toBe("");
});

test("isStarting أثناء الطلب", async () => {
  let release;
  server.use(
    http.patch(`${API}/events/e1`, async () => {
      await new Promise((resolve) => {
        release = resolve;
      });
      return HttpResponse.json({});
    }),
  );
  const { result } = renderHook(() => useRoundStatus({ eventId: "e1", refetch: vi.fn() }));

  let pending;
  act(() => {
    pending = result.current.changeStatus("live");
  });

  await waitFor(() => expect(result.current.isStarting).toBe(true));
  await act(async () => {
    release();
    await pending;
  });
  expect(result.current.isStarting).toBe(false);
});

test("فشل الطلب: رسالة خطأ وما يعيد الجلب", async () => {
  server.use(http.patch(`${API}/events/e1`, () => HttpResponse.json({}, { status: 400 })));
  const refetch = vi.fn();
  const { result } = renderHook(() => useRoundStatus({ eventId: "e1", refetch }));

  await act(() => result.current.changeStatus("live"));

  expect(result.current.startError).toBe("تعذر تحديث حالة الجولة.");
  expect(refetch).not.toHaveBeenCalled();
});
