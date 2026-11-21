import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { makeEvent } from "../../../test/fixtures";
import { TEST_TOKEN, renderHookWithProviders } from "../../../test/renderWithProviders";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { useEventDetails } from "./useEventDetails";

test("يجلب الجولة ويحفظها تحت مفتاحها", async () => {
  const event = makeEvent();
  server.use(http.get(`${API}/events/e1`, () => HttpResponse.json(event)));

  const { result, queryClient } = renderHookWithProviders(() => useEventDetails("e1"));

  await waitFor(() => expect(result.current.data).toEqual(event));
  expect(queryClient.getQueryData(queryKeys.event("e1", TEST_TOKEN))).toEqual(event);
});

function trackRequests() {
  const seen = { requested: false };
  server.use(
    http.get(`${API}/events/:id`, () => {
      seen.requested = true;
      return HttpResponse.json({});
    }),
  );
  return seen;
}

test("بدون رقم جولة ما يرسل طلب", async () => {
  const seen = trackRequests();

  renderHookWithProviders(() => useEventDetails(undefined));

  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(seen.requested).toBe(false);
});

test("بدون دخول ما يرسل طلب", async () => {
  const seen = trackRequests();

  renderHookWithProviders(() => useEventDetails("e1"), { token: null });

  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(seen.requested).toBe(false);
});

test("فشل الجلب", async () => {
  server.use(http.get(`${API}/events/e1`, () => HttpResponse.json({}, { status: 404 })));

  const { result } = renderHookWithProviders(() => useEventDetails("e1"));

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error.status).toBe(404);
});
