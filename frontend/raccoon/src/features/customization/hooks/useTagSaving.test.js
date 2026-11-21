import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, test, vi } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { makeEvent, makeTag } from "../../../test/fixtures";
import { useStagedEdits } from "./useStagedEdits";
import { useTagSaving } from "./useTagSaving";

const tags = [
  makeTag(1),
  makeTag(2, { is_configured: true, tag_type: "trap", content: { boom: 1 } }),
];

function makeTagForm(form = {}) {
  return {
    selectedTag: tags[0],
    form: {
      hint: "عند الباب",
      image: "",
      trap: "none",
      freezeSeconds: 60,
      ...form,
    },
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

// useTagSaving مع useStagedEdits حقيقي، مثل الصفحة. result.current.staging = الحفظ المؤقت
function renderSaving({
  event = makeEvent({ tags }),
  tagForm = makeTagForm(),
  supportsTraps = true,
} = {}) {
  const refetch = vi.fn().mockResolvedValue({});
  const view = renderHook(() => {
    const staging = useStagedEdits();
    const saving = useTagSaving({
      eventId: "e1",
      event,
      refetch,
      tagForm,
      supportsTraps,
      staging,
    });
    return { ...saving, staging };
  });
  return { ...view, refetch, tagForm };
}

const draft = () => makeEvent({ tags });
const paused = (edits = 3) =>
  makeEvent({ tags, status: "paused", mode: "seq", edits_remaining: edits });

describe("الحالة 1: «حفظ» على قطعة فيها تعديل = حفظ مؤقت", () => {
  test.each([
    ["المسودة", draft],
    ["وضع التعديل", paused],
  ])("%s: بدون أي طلب، والقطعة تنحفظ في المؤقت", (_, makeEventFor) => {
    const requests = recordSaves();
    const { result, tagForm, refetch } = renderSaving({
      event: makeEventFor(),
    });

    act(() => result.current.stageTag({ allowed: true }));

    expect(requests).toEqual([]);
    expect(refetch).not.toHaveBeenCalled();
    expect(result.current.staging.staged.t1).toEqual({
      tag_id: "t1",
      tag_type: "clue",
      content: { hint: "عند الباب" },
    });
    expect(tagForm.reset).toHaveBeenCalled();
    expect(result.current.saveSuccess).toBe(
      "انحفظت القطعة 01 مؤقتًا. لما تخلص كل القطع اضغط «حفظ» مرة ثانية.",
    );
  });

  test("allowed=false ما يسوي شي", () => {
    const { result } = renderSaving();

    act(() => result.current.stageTag({ allowed: false }));

    expect(result.current.staging.count).toBe(0);
  });

  test("فخ في الصيد المفتوح يُحفظ كفخ", () => {
    const { result } = renderSaving({
      tagForm: makeTagForm({ trap: "freeze", freezeSeconds: "45" }),
    });

    act(() => result.current.stageTag({ allowed: true }));

    expect(result.current.staging.staged.t1).toEqual({
      tag_id: "t1",
      tag_type: "trap",
      content: { freeze: 45 },
    });
  });

  test("التسلسلي يتجاهل الفخ ويحفظ تلميح", () => {
    const { result } = renderSaving({
      supportsTraps: false,
      tagForm: makeTagForm({ trap: "boom" }),
    });

    act(() => result.current.stageTag({ allowed: true }));

    expect(result.current.staging.staged.t1.tag_type).toBe("clue");
  });

  test("الصورة الجديدة ما تنرفع وقت الحفظ المؤقت", () => {
    let uploads = 0;
    server.use(
      http.post(`${API}/events/upload-image`, () => {
        uploads += 1;
        return HttpResponse.json({ url: "https://cdn.test/h.png" });
      }),
    );
    const image = new Blob(["x"], { type: "image/png" });
    const { result } = renderSaving({ tagForm: makeTagForm({ image }) });

    act(() => result.current.stageTag({ allowed: true }));

    expect(uploads).toBe(0);
    expect(result.current.staging.staged.t1.content.image).toBe(image);
  });
});

describe("الحالة 2: «حفظ» بدون تعديل = حفظ كل القطع في طلب واحد", () => {
  test("المسودة: كل القطع لـ setup، المؤقت فوق المحفوظ، والفاضية تلميح فارغ", async () => {
    const requests = recordSaves();
    const { result, refetch } = renderSaving();
    act(() =>
      result.current.staging.stage({
        tag_id: "t2",
        tag_type: "clue",
        content: { hint: "جديد" },
      }),
    );

    await act(() => result.current.saveAllTags({ allowed: true }));

    expect(requests).toEqual([
      {
        path: "/events/e1/setup",
        body: {
          tags_config: [
            { tag_id: "t1", tag_type: "clue", content: { hint: "" } },
            { tag_id: "t2", tag_type: "clue", content: { hint: "جديد" } },
          ],
        },
      },
    ]);
    expect(refetch).toHaveBeenCalled();
    expect(result.current.staging.count).toBe(0);
    expect(result.current.saveSuccess).toBe("تم حفظ جميع القطع (2) بنجاح.");
  });

  test("وضع التعديل: كل القطع في طلب edit واحد، ثم يقفل التعديل ويمسح المؤقت", async () => {
    const requests = recordSaves();
    const { result } = renderSaving({ event: paused() });
    await act(() => result.current.startEditing({ allowed: true }));
    act(() =>
      result.current.staging.stage({
        tag_id: "t1",
        tag_type: "clue",
        content: { hint: "أ" },
      }),
    );

    await act(() => result.current.saveAllTags({ allowed: true }));

    expect(requests).toEqual([
      {
        path: "/events/e1/edit",
        body: {
          tags_config: [
            { tag_id: "t1", tag_type: "clue", content: { hint: "أ" } },
            { tag_id: "t2", tag_type: "trap", content: { boom: 1 } },
          ],
        },
      },
    ]);
    expect(result.current.isEditing).toBe(false);
    expect(result.current.staging.count).toBe(0);
    expect(result.current.saveSuccess).toBe("تم حفظ تعديلات الباقة بنجاح.");
  });

  test("وضع التعديل بدون أي تعديل: يحفظ القطع مثل ما هي (طلب edit)", async () => {
    const requests = recordSaves();
    const { result } = renderSaving({ event: paused() });

    await act(() => result.current.saveAllTags({ allowed: true }));

    expect(requests.map((r) => r.path)).toEqual(["/events/e1/edit"]);
    expect(requests[0].body.tags_config).toHaveLength(2);
  });

  test("يرفع صور المؤقت أول ويحفظ روابطها", async () => {
    const requests = recordSaves();
    server.use(
      http.post(`${API}/events/upload-image`, () =>
        HttpResponse.json({ url: "https://cdn.test/h.png" }),
      ),
    );
    const { result } = renderSaving({ event: paused() });
    act(() => {
      result.current.staging.stage({
        tag_id: "t1",
        tag_type: "clue",
        content: { hint: "أ", image: new Blob(["x"], { type: "image/png" }) },
      });
    });

    await act(() => result.current.saveAllTags({ allowed: true }));

    expect(requests[0].body.tags_config[0].content).toEqual({
      hint: "أ",
      image: "https://cdn.test/h.png",
    });
  });

  test("الخادم ما رجّع رابط الصورة: رسالة خطأ بدون حفظ، والمؤقت يبقى", async () => {
    const requests = recordSaves();
    server.use(
      http.post(`${API}/events/upload-image`, () => HttpResponse.json({})),
    );
    const { result } = renderSaving();
    act(() => {
      result.current.staging.stage({
        tag_id: "t1",
        tag_type: "clue",
        content: { hint: "", image: new Blob(["x"], { type: "image/png" }) },
      });
    });

    await act(() => result.current.saveAllTags({ allowed: true }));

    expect(result.current.saveError).toBe(
      "لم يرجع الخادم رابط الصورة. حاول مرة أخرى.",
    );
    expect(requests).toEqual([]);
    expect(result.current.staging.count).toBe(1);
  });

  test.each([
    ["المسودة", draft, "حدث خطأ أثناء حفظ إعدادات القطعة."],
    ["وضع التعديل", paused, "تعذر حفظ تعديلات الباقة."],
  ])(
    "فشل الحفظ (%s): رسالة الخادم، والمؤقت يبقى لإعادة المحاولة",
    async (_, makeEventFor, message) => {
      recordSaves(() => HttpResponse.json({}, { status: 500 }));
      const { result, refetch } = renderSaving({ event: makeEventFor() });
      act(() =>
        result.current.staging.stage({
          tag_id: "t1",
          tag_type: "clue",
          content: { hint: "أ" },
        }),
      );

      await act(() => result.current.saveAllTags({ allowed: true }));

      expect(result.current.saveError).toBe(message);
      expect(result.current.staging.count).toBe(1);
      expect(refetch).not.toHaveBeenCalled();
    },
  );

  test("allowed=false ما يرسل شي", async () => {
    const requests = recordSaves();
    const { result } = renderSaving();

    await act(() => result.current.saveAllTags({ allowed: false }));

    expect(requests).toEqual([]);
  });
});

describe("وضع التعديل", () => {
  test("الصيد المفتوح يصفّر الجولة قبل التعديل", async () => {
    const requests = recordSaves();
    const { result, refetch } = renderSaving({
      event: makeEvent({ tags, status: "paused", mode: "open" }),
    });

    await act(() => result.current.startEditing({ allowed: true }));

    expect(requests.map((r) => r.path)).toEqual(["/events/e1/reset"]);
    expect(refetch).toHaveBeenCalled();
    expect(result.current.isEditing).toBe(true);
  });

  test("التسلسلي يدخل التعديل بدون تصفير", async () => {
    const requests = recordSaves();
    const { result } = renderSaving({
      event: makeEvent({ tags, status: "paused", mode: "seq" }),
    });

    await act(() => result.current.startEditing({ allowed: true }));

    expect(requests).toEqual([]);
    expect(result.current.isEditing).toBe(true);
  });

  test("فشل التصفير: رسالة وما يدخل التعديل", async () => {
    recordSaves(() =>
      HttpResponse.json({ detail: "Cannot reset" }, { status: 400 }),
    );
    const { result } = renderSaving({
      event: makeEvent({ tags, status: "paused", mode: "open" }),
    });

    await act(() => result.current.startEditing({ allowed: true }));

    expect(result.current.saveError).toBe("Cannot reset");
    expect(result.current.isEditing).toBe(false);
  });

  test("cancelEditing يرجع كل شي", async () => {
    recordSaves();
    const { result, tagForm } = renderSaving({
      event: makeEvent({ tags, status: "paused", mode: "seq" }),
    });
    await act(() => result.current.startEditing({ allowed: true }));

    let cancelled;
    act(() => {
      cancelled = result.current.cancelEditing();
    });

    expect(cancelled).toBe(true);
    expect(result.current.isEditing).toBe(false);
    expect(tagForm.reset).toHaveBeenCalled();
  });

  test("cancelEditing يمسح الحفظ المؤقت", async () => {
    recordSaves();
    const { result } = renderSaving({
      event: makeEvent({ tags, status: "paused", mode: "seq" }),
    });
    await act(() => result.current.startEditing({ allowed: true }));
    act(() => result.current.stageTag({ allowed: true }));
    expect(result.current.staging.count).toBe(1);

    act(() => {
      result.current.cancelEditing();
    });

    expect(result.current.staging.count).toBe(0);
  });
});
