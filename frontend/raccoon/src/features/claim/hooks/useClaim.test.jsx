import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { makeEvent, makePack, testUser } from "../../../test/fixtures";
import { renderHookWithProviders, waitForSignIn } from "../../../test/renderWithProviders";
import { useAuth } from "../../../shared/auth/AuthContext";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { useClaim } from "./useClaim";

const HASH = "q8Zr_abc-1";

/*
  خادم وهمي للربط. يرجع عدادات الطلبات.
    preview  رد المعاينة (الباكج)
    claim    رد الربط (دالة)، أو null لو ما نتوقع ربط
    events   جولات المستخدم
*/
function mockClaimServer({ preview = makePack(), claim = null, events = [] } = {}) {
  const calls = { preview: 0, claim: [], events: 0 };
  let current = preview;

  server.use(
    http.get(`${API}/packs/preview/:hash`, () => {
      calls.preview += 1;
      return HttpResponse.json(current);
    }),
    http.post(`${API}/packs/claim`, async ({ request }) => {
      calls.claim.push(await request.json());
      const response = claim();
      if (response.status === 200) current = await response.clone().json();
      return response;
    }),
    http.get(`${API}/events`, () => {
      calls.events += 1;
      return HttpResponse.json(events);
    }),
  );

  return calls;
}

async function renderClaim(hash = HASH, options = {}) {
  const view = renderHookWithProviders(() => useClaim(hash, useAuth()), {
    route: `/claim/${hash}`,
    ...options,
  });
  if (options.token !== null) await waitForSignIn(view.queryClient);
  return view;
}

test("رابط بصيغة غلط: ما يرسل أي طلب", async () => {
  const calls = mockClaimServer();

  const { result } = await renderClaim("bad hash/x");

  expect(result.current.validHash).toBe(false);
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(calls.preview).toBe(0);
});

describe("زائر", () => {
  test("يشوف المعاينة، وزر الدخول يحفظ رابط الرجوع", async () => {
    mockClaimServer();
    const { result, location } = await renderClaim(HASH, { token: null });

    await waitFor(() => expect(result.current.pack).toEqual(makePack()));
    expect(result.current.signedIn).toBe(false);

    act(() => result.current.goToAuth("/login"));

    expect(location.current.pathname).toBe("/login");
    expect(JSON.parse(sessionStorage.getItem("raccoon_claim_return")).path).toBe(`/claim/${HASH}`);
  });

  test("claim ما يسوي شي للزائر", async () => {
    const calls = mockClaimServer();
    const { result } = await renderClaim(HASH, { token: null });
    await waitFor(() => expect(result.current.pack).toBeDefined());

    act(() => result.current.claim());

    expect(calls.claim).toEqual([]);
  });
});

describe("ربط باكج ما له مالك", () => {
  const owned = makePack({ owner_id: testUser.id });

  test("يربط، يحدّث الكاش، ويجيب الجولة لزر التخصيص", async () => {
    const calls = mockClaimServer({
      claim: () => HttpResponse.json(owned),
      events: [makeEvent({ id: "e1", pack_id: 11 }), makeEvent({ id: "e9", pack_id: 99 })],
    });
    const { result, queryClient, location } = await renderClaim();
    await waitFor(() => expect(result.current.pack).toBeDefined());
    queryClient.setQueryData(queryKeys.myEvents(testUser.id), []);

    act(() => result.current.claim());

    await waitFor(() => expect(result.current.ownedByMe).toBe(true));
    expect(calls.claim).toEqual([{ master_auth_hash: HASH }]);
    expect(queryClient.getQueryData(queryKeys.packInfo(testUser.id, 11))).toEqual(owned);
    expect(queryClient.getQueryState(queryKeys.myEvents(testUser.id)).isInvalidated).toBe(true);

    await waitFor(() => expect(result.current.targetEvent?.id).toBe("e1"));
    act(() => result.current.openCustomization());
    expect(location.current.pathname).toBe("/customization/e1");
  });

  test("ضغطتين ترسل طلب ربط واحد", async () => {
    const calls = mockClaimServer({ claim: () => HttpResponse.json(owned) });
    const { result } = await renderClaim();
    await waitFor(() => expect(result.current.pack).toBeDefined());

    act(() => {
      result.current.claim();
      result.current.claim();
    });

    await waitFor(() => expect(result.current.ownedByMe).toBe(true));
    expect(calls.claim).toHaveLength(1);
  });

  test("فشل الربط: يعيد المعاينة للتأكد من الملكية", async () => {
    const calls = mockClaimServer({ claim: () => HttpResponse.json({}, { status: 500 }) });
    const { result } = await renderClaim();
    await waitFor(() => expect(result.current.previewQuery.isSuccess).toBe(true));
    // المعاينة تنجلب مرتين عند الفتح: كزائر ثم بعد تحميل الحساب (المفتاح فيه رقم المستخدم)
    const before = calls.preview;

    act(() => result.current.claim());

    await waitFor(() => expect(result.current.claimMutation.isError).toBe(true));
    await waitFor(() => expect(calls.preview).toBe(before + 1));
    expect(result.current.claimMutation.error.message).toBe("تعذر ربط الباكج بحسابك.");
  });
});

test("باكج لحساب ثاني: ما يربط وما يجيب الجولات", async () => {
  const calls = mockClaimServer({ preview: makePack({ owner_id: 999 }) });
  const { result } = await renderClaim();

  await waitFor(() => expect(result.current.ownedByAnother).toBe(true));
  act(() => result.current.claim());

  expect(result.current.ownedByMe).toBe(false);
  expect(calls.claim).toEqual([]);
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(calls.events).toBe(0);
});

describe("باكج لي من قبل", () => {
  const mine = makePack({ owner_id: testUser.id });

  test("جولتين لنفس الباكج: ما فيه هدف واحد للتخصيص", async () => {
    mockClaimServer({
      preview: mine,
      events: [makeEvent({ id: "e1", pack_id: 11 }), makeEvent({ id: "e2", pack_id: 11 })],
    });
    const { result, location } = await renderClaim();

    await waitFor(() => expect(result.current.matchingEvents).toHaveLength(2));
    expect(result.current.targetEvent).toBeNull();

    act(() => result.current.openCustomization());
    expect(location.current.pathname).toBe(`/claim/${HASH}`);
  });

  test("openPackages ينقل لصفحة التجارب", async () => {
    mockClaimServer({ preview: mine });
    const { result, location } = await renderClaim();
    await waitFor(() => expect(result.current.ownedByMe).toBe(true));

    act(() => result.current.openPackages());

    expect(location.current.pathname).toBe("/packages");
  });
});
