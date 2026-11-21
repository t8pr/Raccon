import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { makeEvent } from "../../../test/fixtures";
import { renderHookWithProviders } from "../../../test/renderWithProviders";
import { useAuth } from "../../../shared/auth/AuthContext";
import { useMyPackages } from "./useMyPackages";

const renderPackages = (options) => renderHookWithProviders(() => useMyPackages(useAuth()), options);

test("مستخدم داخل: يجلب جولاته ويحوّلها لبطاقات", async () => {
  server.use(
    http.get(`${API}/events`, () =>
      HttpResponse.json([
        makeEvent({ id: "e1", title: "مكتب", mode: "seq", tags_count: 10 }),
        makeEvent({ id: "e2", title: "Untitled Event", mode: "open", tags_count: 6 }),
      ]),
    ),
  );

  const { result } = renderPackages();

  await waitFor(() => expect(result.current.items).toHaveLength(2));
  expect(result.current.signedIn).toBe(true);
  expect(result.current.items).toEqual([
    { id: "e1", eventId: "e1", name: "مكتب", mode: "seq", pieces: 10 },
    { id: "e2", eventId: "e2", name: "بدون اسم", mode: "open", pieces: 6 },
  ]);
});

test("زائر: ما يرسل طلب ولا يرجع بطاقات", async () => {
  let requested = false;
  server.use(
    http.get(`${API}/events`, () => {
      requested = true;
      return HttpResponse.json([]);
    }),
  );

  const { result } = renderPackages({ token: null });

  expect(result.current.signedIn).toBe(false);
  expect(result.current.items).toEqual([]);
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(requested).toBe(false);
});

test("فشل الجلب: رسالة خطأ عربية", async () => {
  server.use(http.get(`${API}/events`, () => HttpResponse.json({}, { status: 500 })));

  const { result } = renderPackages();

  await waitFor(() => expect(result.current.eventsQuery.isError).toBe(true));
  expect(result.current.eventsQuery.error.message).toBe("تعذر تحميل باقاتك.");
  expect(result.current.items).toEqual([]);
});
