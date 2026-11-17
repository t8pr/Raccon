import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, test, vi } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { makeEvent, makeTag } from "../../../test/fixtures";
import { useTagSaving } from "./useTagSaving";

const tags = [
  makeTag(1),
  makeTag(2, { is_configured: true, tag_type: "trap", content: { boom: 1 } }),
];

function makeTagForm(form = {}) {
  return {
    selectedTag: tags[0],
    form: { hint: "عند الباب", image: "", trap: "none", freezeSeconds: 60, ...form },
    reset: vi.fn(),
    setImage: vi.fn(),
  };
}

// يسجل كل طلب حفظ: المسار والمحتوى
function recordSaves(response = () => HttpResponse.json({ ok: true })) {
  const requests = [];
  const record = async ({ request }) => {
    const path = new URL(request.url).pathname;
    requests.push({ path, body: await request.json().catch(() => null) });
    return response();
  };
  server.use(
    http.put(`${API}/events/e1/setup`, record),
    http.put(`${API}/events/e1/edit`, record),
    http.post(`${API}/events/e1/reset`, record),
  );
  return requests;
}

function renderSaving({ event = makeEvent({ tags }), tagForm = makeTagForm(), supportsTraps = true } = {}) {
  const refetch = vi.fn().mockResolvedValue({});
  const view = renderHook(() =>
    useTagSaving({ eventId: "e1", event, refetch, tagForm, supportsTraps }),
  );
  return { ...view, refetch, tagForm };
}

describe("حفظ قطعة في المسودة", () => {
  test("يرسل القطعة لـ setup ثم يعيد الجلب ويمسح النموذج", async () => {
    const requests = recordSaves();
    const { result, refetch, tagForm } = renderSaving();

    await act(() => result.current.saveTags({ allowed: true }));

    expect(requests).toEqual([
      {
        path: "/events/e1/setup",
        body: { tags_config: [{ tag_id: "t1", tag_type: "clue", content: { hint: "عند الباب" } }] },
      },
    ]);
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(tagForm.reset).toHaveBeenCalledTimes(1);
    expect(result.current.saveSuccess).toBe("انحفظت القطعة 01 بنجاح");
    expect(result.current.isSaving).toBe(false);
  });

  test("allowed=false ما يسوي شي", async () => {
    const requests = recordSaves();
    const { result } = renderSaving();

    await act(() => result.current.saveTags({ allowed: false }));

    expect(requests).toEqual([]);
  });

  test("فخ في الصيد المفتوح يُحفظ كفخ", async () => {
    const requests = recordSaves();
    const { result } = renderSaving({ tagForm: makeTagForm({ trap: "freeze", freezeSeconds: "45" }) });

    await act(() => result.current.saveTags({ allowed: true }));

    expect(requests[0].body.tags_config[0]).toEqual({
      tag_id: "t1",
      tag_type: "trap",
      content: { freeze: 45 },
    });
  });

  test("التسلسلي يتجاهل الفخ ويحفظ تلميح", async () => {
    const requests = recordSaves();
    const { result } = renderSaving({
      supportsTraps: false,
      tagForm: makeTagForm({ trap: "boom" }),
    });

    await act(() => result.current.saveTags({ allowed: true }));

    expect(requests[0].body.tags_config[0].tag_type).toBe("clue");
  });
});

test("حفظ الكل: كل القطع في طلب واحد", async () => {
  const requests = recordSaves();
  const { result } = renderSaving();

  await act(() => result.current.saveTags({ allowed: true, saveAll: true }));

  expect(requests[0].body.tags_config).toEqual([
    { tag_id: "t1", tag_type: "clue", content: { hint: "عند الباب" } },
    { tag_id: "t2", tag_type: "trap", content: { boom: 1 } },
  ]);
  expect(result.current.saveSuccess).toBe("تم حفظ جميع القطع (2) بنجاح.");
});

describe("الجولة المتوقفة", () => {
  const paused = (edits) => makeEvent({ tags, status: "paused", edits_remaining: edits });

  test("الحفظ يروح لـ edit ويقفل وضع التعديل", async () => {
    const requests = recordSaves();
    const { result } = renderSaving({ event: paused(3) });

    await act(() => result.current.saveTags({ allowed: true }));

    expect(requests[0].path).toBe("/events/e1/edit");
    expect(result.current.isEditing).toBe(false);
  });

  test("آخر تعديل: تحذير بدون حفظ، وبعد التأكيد يحفظ", async () => {
    const requests = recordSaves();
    const { result } = renderSaving({ event: paused(1) });

    await act(() => result.current.saveTags({ allowed: true }));
    expect(result.current.showLastEditWarning).toBe(true);
    expect(requests).toEqual([]);

    await act(() => result.current.saveTags({ allowed: true, lastEditConfirmed: true }));
    expect(result.current.showLastEditWarning).toBe(false);
    expect(requests).toHaveLength(1);
  });

  test("dismissLastEditWarning يقفل التحذير", async () => {
    recordSaves();
    const { result } = renderSaving({ event: paused(1) });
    await act(() => result.current.saveTags({ allowed: true }));

    act(() => result.current.dismissLastEditWarning());

    expect(result.current.showLastEditWarning).toBe(false);
  });
});

describe("الصورة", () => {
  test("الصورة الجديدة تنرفع أول، والقطعة تحفظ رابطها", async () => {
    const requests = recordSaves();
    server.use(
      http.post(`${API}/events/upload-image`, () => HttpResponse.json({ url: "https://cdn.test/h.png" })),
    );
    const image = new Blob(["x"], { type: "image/png" });
    const { result, tagForm } = renderSaving({ tagForm: makeTagForm({ image }) });

    await act(() => result.current.saveTags({ allowed: true }));

    expect(tagForm.setImage).toHaveBeenCalledWith("https://cdn.test/h.png");
    expect(requests[0].body.tags_config[0].content).toEqual({
      hint: "عند الباب",
      image: "https://cdn.test/h.png",
    });
  });

  test("الخادم ما رجّع رابط: رسالة خطأ بدون حفظ", async () => {
    const requests = recordSaves();
    server.use(http.post(`${API}/events/upload-image`, () => HttpResponse.json({})));
    const image = new Blob(["x"], { type: "image/png" });
    const { result } = renderSaving({ tagForm: makeTagForm({ image }) });

    await act(() => result.current.saveTags({ allowed: true }));

    expect(result.current.saveError).toBe("لم يرجع الخادم رابط الصورة. حاول مرة أخرى.");
    expect(requests).toEqual([]);
  });
});

test("فشل الحفظ: رسالة الخادم وما يمسح النموذج", async () => {
  recordSaves(() => HttpResponse.json({}, { status: 500 }));
  const { result, tagForm, refetch } = renderSaving();

  await act(() => result.current.saveTags({ allowed: true }));

  expect(result.current.saveError).toBe("حدث خطأ أثناء حفظ إعدادات القطعة.");
  expect(tagForm.reset).not.toHaveBeenCalled();
  expect(refetch).not.toHaveBeenCalled();
});

describe("وضع التعديل", () => {
  test("الصيد المفتوح يصفّر الجولة قبل التعديل", async () => {
    const requests = recordSaves();
    const { result, refetch } = renderSaving({ event: makeEvent({ tags, status: "paused", mode: "open" }) });

    await act(() => result.current.startEditing({ allowed: true }));

    expect(requests.map((r) => r.path)).toEqual(["/events/e1/reset"]);
    expect(refetch).toHaveBeenCalled();
    expect(result.current.isEditing).toBe(true);
  });

  test("التسلسلي يدخل التعديل بدون تصفير", async () => {
    const requests = recordSaves();
    const { result } = renderSaving({ event: makeEvent({ tags, status: "paused", mode: "seq" }) });

    await act(() => result.current.startEditing({ allowed: true }));

    expect(requests).toEqual([]);
    expect(result.current.isEditing).toBe(true);
  });

  test("فشل التصفير: رسالة وما يدخل التعديل", async () => {
    recordSaves(() => HttpResponse.json({ detail: "Cannot reset" }, { status: 400 }));
    const { result } = renderSaving({ event: makeEvent({ tags, status: "paused", mode: "open" }) });

    await act(() => result.current.startEditing({ allowed: true }));

    expect(result.current.saveError).toBe("Cannot reset");
    expect(result.current.isEditing).toBe(false);
  });

  test("cancelEditing يرجع كل شي", async () => {
    recordSaves();
    const { result, tagForm } = renderSaving({ event: makeEvent({ tags, status: "paused", mode: "seq" }) });
    await act(() => result.current.startEditing({ allowed: true }));

    let cancelled;
    act(() => {
      cancelled = result.current.cancelEditing();
    });

    expect(cancelled).toBe(true);
    expect(result.current.isEditing).toBe(false);
    expect(tagForm.reset).toHaveBeenCalled();
  });
});
