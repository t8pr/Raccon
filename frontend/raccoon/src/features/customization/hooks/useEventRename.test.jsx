import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { makeEvent, testUser } from "../../../test/fixtures";
import { TEST_TOKEN, renderHookWithProviders, waitForSignIn } from "../../../test/renderWithProviders";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { useEventRename } from "./useEventRename";

const submit = { preventDefault: () => {} };

// يجهز الكاش كأن صفحة التخصيص وباقاتي محمّلتين، بعد تحميل الحساب
async function renderRename() {
  const view = renderHookWithProviders(() => useEventRename("e1"));
  const event = makeEvent({ tags: [{ tag_id: "t1", content: { hint: "لا يتغيّر" } }] });

  view.queryClient.setQueryData(queryKeys.event("e1", TEST_TOKEN), event);
  view.queryClient.setQueryData(queryKeys.myEvents(testUser.id), [event, makeEvent({ id: "e2" })]);

  await waitForSignIn(view.queryClient);
  return view;
}

function onRename(response) {
  const bodies = [];
  server.use(
    http.patch(`${API}/events/e1`, async ({ request }) => {
      bodies.push(await request.json());
      return typeof response === "function" ? response() : response;
    }),
  );
  return bodies;
}

test("start يفتح الحقل بالاسم الحالي، و cancel يقفله", async () => {
  const { result } = await renderRename();

  act(() => result.current.start("جولة"));
  expect(result.current.editing).toBe(true);
  expect(result.current.draft).toBe("جولة");

  act(() => result.current.cancel());
  expect(result.current.editing).toBe(false);
});

test("start بدون اسم يبدأ فاضي", async () => {
  const { result } = await renderRename();

  act(() => result.current.start(undefined));

  expect(result.current.draft).toBe("");
});

describe("التحقق قبل الإرسال", () => {
  test.each([
    ["فاضي", "   "],
    ["أكثر من 20 حرف", "ا".repeat(21)],
  ])("%s: رسالة بدون طلب", async (_, name) => {
    const bodies = onRename(HttpResponse.json({}));
    const { result } = await renderRename();
    act(() => result.current.start(""));
    act(() => result.current.setDraft(name));

    await act(() => result.current.save(submit));

    expect(result.current.error).toBe("اكتب اسمًا من حرف إلى 20 حرفًا.");
    expect(result.current.editing).toBe(true);
    expect(bodies).toEqual([]);
  });
});

test("الحفظ: يرسل الاسم بعد القص، ويغيّر العنوان فقط في الكاش", async () => {
  const bodies = onRename(HttpResponse.json({ id: "e1", title: "اسم جديد" }));
  const { result, queryClient } = await renderRename();
  act(() => result.current.start("جولة"));
  act(() => result.current.setDraft("  اسم جديد  "));

  await act(() => result.current.save(submit));

  expect(bodies).toEqual([{ title: "اسم جديد" }]);
  expect(result.current.editing).toBe(false);
  expect(result.current.error).toBe("");

  const event = queryClient.getQueryData(queryKeys.event("e1", TEST_TOKEN));
  expect(event.title).toBe("اسم جديد");
  expect(event.tags).toEqual([{ tag_id: "t1", content: { hint: "لا يتغيّر" } }]);

  const list = queryClient.getQueryData(queryKeys.myEvents(testUser.id));
  expect(list.map((item) => item.title)).toEqual(["اسم جديد", "جولة يوم التأسيس"]);
});

test("لو الخادم ما رجّع العنوان يستخدم المكتوب", async () => {
  onRename(HttpResponse.json({}));
  const { result, queryClient } = await renderRename();
  act(() => result.current.start(""));
  act(() => result.current.setDraft("مكتب"));

  await act(() => result.current.save(submit));

  expect(queryClient.getQueryData(queryKeys.event("e1", TEST_TOKEN)).title).toBe("مكتب");
});

test("فشل الحفظ: رسالة ويبقى الحقل مفتوح", async () => {
  onRename(HttpResponse.json({}, { status: 500 }));
  const { result, queryClient } = await renderRename();
  act(() => result.current.start("جولة"));
  act(() => result.current.setDraft("مكتب"));

  await act(() => result.current.save(submit));

  expect(result.current.error).toBe("تعذر حفظ الاسم. حاول مرة أخرى.");
  expect(result.current.editing).toBe(true);
  expect(queryClient.getQueryData(queryKeys.event("e1", TEST_TOKEN)).title).toBe("جولة يوم التأسيس");
});

test("ضغطتين حفظ ترسل طلب واحد، والإلغاء ممنوع أثناء الحفظ", async () => {
  let release;
  const bodies = onRename(async () => {
    await new Promise((resolve) => {
      release = resolve;
    });
    return HttpResponse.json({ title: "مكتب" });
  });
  const { result } = await renderRename();
  act(() => result.current.start(""));
  act(() => result.current.setDraft("مكتب"));

  let first;
  act(() => {
    first = result.current.save(submit);
    result.current.save(submit);
  });
  await waitFor(() => expect(result.current.saving).toBe(true));

  act(() => result.current.cancel());
  expect(result.current.editing).toBe(true);

  await act(async () => {
    release();
    await first;
  });
  expect(bodies).toHaveLength(1);
  expect(result.current.editing).toBe(false);
});
