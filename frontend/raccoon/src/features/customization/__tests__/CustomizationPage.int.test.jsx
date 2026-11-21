import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { makeEvent, makeTag } from "../../../test/fixtures";
import { renderWithProviders } from "../../../test/renderWithProviders";
import CustomizationPage from "../CustomizationPage";

// تجهيز الصورة يحتاج canvas؛ هنا نرجع الملف كما هو (له اختبار مستقل)
vi.mock("../utils/prepareHintImage", () => ({
  prepareHintImage: vi.fn(async (file) => file),
}));

beforeEach(() => {
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: () => "blob:preview",
      revokeObjectURL: () => {},
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/*
  خادم وهمي بحالة: الحفظ يجهّز القطع، وتغيير الحالة يغيّرها، والتصفير يرجع القطع فاضية.
  يرجع سجل الطلبات (requests) والجولة الحالية (state.event).
*/
function mockEventServer(initial) {
  const state = { event: structuredClone(initial) };
  const requests = [];

  const applyTags = (config) => {
    state.event.tags = state.event.tags.map((tag) => {
      const saved = config.find((item) => item.tag_id === tag.tag_id);
      return saved ? { ...tag, ...saved, is_configured: true } : tag;
    });
  };

  server.use(
    http.get(`${API}/events/e1`, () => HttpResponse.json(state.event)),
    http.put(`${API}/events/e1/setup`, async ({ request }) => {
      const body = await request.json();
      requests.push({ type: "setup", body });
      applyTags(body.tags_config);
      return HttpResponse.json(state.event);
    }),
    http.put(`${API}/events/e1/edit`, async ({ request }) => {
      const body = await request.json();
      requests.push({ type: "edit", body });
      applyTags(body.tags_config);
      state.event.edits_remaining -= 1;
      return HttpResponse.json(state.event);
    }),
    http.patch(`${API}/events/e1`, async ({ request }) => {
      const body = await request.json();
      requests.push({ type: "patch", body });
      Object.assign(state.event, body);
      return HttpResponse.json(state.event);
    }),
    http.post(`${API}/events/e1/reset`, () => {
      requests.push({ type: "reset" });
      return HttpResponse.json({});
    }),
    http.post(`${API}/events/upload-image`, () => {
      requests.push({ type: "upload" });
      return HttpResponse.json({ url: "https://cdn.test/hint.png" });
    }),
  );

  return { state, requests };
}

function renderPage(route = "/customization/e1", options) {
  return renderWithProviders(
    <Routes>
      <Route path="/customization" element={<CustomizationPage />} />
      <Route path="/customization/:eventId" element={<CustomizationPage />} />
    </Routes>,
    { route, ...options },
  );
}

const ready = (name = "جولة يوم التأسيس") =>
  screen.findByRole("heading", { level: 1, name });
const configured = (n, overrides) =>
  makeTag(n, {
    is_configured: true,
    content: { hint: `تلميح ${n}` },
    ...overrides,
  });
const readyTags = [configured(1), configured(2), configured(3)];

describe("حالات التحميل", () => {
  test("بدون رقم جولة", async () => {
    renderPage("/customization");

    expect(
      await screen.findByText("اختر جولة من صفحة باقاتي."),
    ).toBeInTheDocument();
  });

  test("بدون دخول", () => {
    renderPage("/customization/e1", { token: null });

    expect(screen.getByText("يرجى تسجيل الدخول.")).toBeInTheDocument();
  });

  test("أثناء التحميل", async () => {
    server.use(http.get(`${API}/events/e1`, async () => delay("infinite")));
    renderPage();

    expect(await screen.findByText("جاري تحميل الباقة...")).toBeInTheDocument();
  });

  test("فشل التحميل ثم «حاول مرة أخرى»", async () => {
    let attempts = 0;
    server.use(
      http.get(`${API}/events/e1`, () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({}, { status: 500 })
          : HttpResponse.json(makeEvent());
      }),
    );
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "حدث خطأ عند استرجاع معلومات الباقه.",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "حاول مرة أخرى" }),
    );

    expect(await ready()).toBeInTheDocument();
  });
});

describe("مسودة: حفظ القطع", () => {
  test("يعرض القطعة الأولى والتقدم وعدد التعديلات", async () => {
    mockEventServer(makeEvent());
    renderPage();
    await ready();

    expect(
      screen.getByRole("heading", { name: "القطعة 01" }),
    ).toBeInTheDocument();
    expect(screen.getByText("0 من 3")).toBeInTheDocument();
    expect(screen.getByText("3/3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ابدأ الجولة" })).toBeDisabled();
    expect(
      screen.getByText(
        "احفظ جميع القطع لتتمكن من بدء الجولة، حتى القطع الفارغة",
      ),
    ).toBeInTheDocument();
  });

  test("زر واحد «حفظ»، متاح حتى بدون تعديل", async () => {
    mockEventServer(makeEvent());
    renderPage();
    await ready();

    const actions = document.querySelector(".customization-editor__actions");
    expect(
      within(actions)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["حفظ"]);
    expect(screen.getByRole("button", { name: "حفظ" })).toBeEnabled();
  });

  test("تلميح ثم «حفظ» = حفظ مؤقت، و«حفظ» مرة ثانية يسأل ويحفظ كل القطع بطلب واحد", async () => {
    const { requests } = mockEventServer(makeEvent());
    renderPage();
    await ready();

    await userEvent.type(screen.getByLabelText("نص التلميح"), "تحت الكرسي");
    expect(screen.getByText("10/255")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));

    expect(
      await screen.findByText(
        "انحفظت القطعة 01 مؤقتًا. لما تخلص كل القطع اضغط «حفظ» مرة ثانية.",
      ),
    ).toBeInTheDocument();
    expect(requests).toEqual([]);

    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));
    const dialog = await screen.findByRole("dialog", {
      name: "حفظ جميع القطع",
    });
    expect(dialog).toHaveTextContent("هل ترغب في المتابعة وحفظ التعديلات؟");
    await userEvent.click(within(dialog).getByRole("button", { name: "نعم" }));

    expect(
      await screen.findByText("تم حفظ جميع القطع (3) بنجاح."),
    ).toBeInTheDocument();
    expect(requests).toEqual([
      {
        type: "setup",
        body: {
          tags_config: [
            { tag_id: "t1", tag_type: "clue", content: { hint: "تحت الكرسي" } },
            { tag_id: "t2", tag_type: "clue", content: { hint: "" } },
            { tag_id: "t3", tag_type: "clue", content: { hint: "" } },
          ],
        },
      },
    ]);
    expect(await screen.findByText("3 من 3")).toBeInTheDocument();
  });

  test("فخ تجميد: مدة غلط تقفل «حفظ»، والمدة الصحيحة تنحفظ", async () => {
    const { requests } = mockEventServer(makeEvent());
    renderPage();
    await ready();

    await userEvent.click(screen.getByRole("radio", { name: /^تجميد/ }));
    const seconds = screen.getByRole("spinbutton", {
      name: "مدة التجميد بالثواني",
    });
    await userEvent.clear(seconds);
    await userEvent.type(seconds, "500");
    expect(screen.getByRole("button", { name: "حفظ" })).toBeDisabled();

    await userEvent.clear(seconds);
    await userEvent.type(seconds, "45");
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));
    await screen.findByText(/انحفظت القطعة 01 مؤقتًا/);

    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "نعم",
      }),
    );

    await screen.findByText("تم حفظ جميع القطع (3) بنجاح.");
    expect(requests[0].body.tags_config[0]).toEqual({
      tag_id: "t1",
      tag_type: "trap",
      content: { freeze: 45 },
    });
  });

  test("التسلسلي ما فيه فخاخ", async () => {
    mockEventServer(makeEvent({ mode: "seq" }));
    renderPage();
    await ready();

    expect(
      screen.queryByRole("group", { name: /الفخ/ }),
    ).not.toBeInTheDocument();
  });

  test("صورة التلميح: ما تنرفع إلا في الحفظ النهائي، والقطعة تحفظ رابطها", async () => {
    const { requests } = mockEventServer(makeEvent());
    const { container } = renderPage();
    await ready();

    const file = new File(["png"], "hint.png", { type: "image/png" });
    await userEvent.upload(container.querySelector('input[type="file"]'), file);
    expect(
      await screen.findByRole("img", { name: "تلميح" }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));
    await screen.findByText(/انحفظت القطعة 01 مؤقتًا/);
    expect(requests).toEqual([]);

    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "نعم",
      }),
    );

    await screen.findByText("تم حفظ جميع القطع (3) بنجاح.");
    expect(requests.map((r) => r.type)).toEqual(["upload", "setup"]);
    expect(requests[1].body.tags_config[0].content).toEqual({
      hint: "",
      image: "https://cdn.test/hint.png",
    });
  });

  test("الانتقال لقطعة ثانية مع تعديلات غير محفوظة يسأل أول", async () => {
    mockEventServer(makeEvent());
    const confirm = vi
      .spyOn(window, "confirm")
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    renderPage();
    await ready();

    await userEvent.type(screen.getByLabelText("نص التلميح"), "x");
    await userEvent.click(screen.getByRole("button", { name: /^القطعة 2،/ }));
    expect(
      screen.getByRole("heading", { name: "القطعة 01" }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^القطعة 2،/ }));
    expect(
      screen.getByRole("heading", { name: "القطعة 02" }),
    ).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  test("«حفظ» بدون أي تعديل: يسأل ثم يحفظ كل القطع مثل ما هي", async () => {
    const { requests } = mockEventServer(makeEvent());
    renderPage();
    await ready();

    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));
    const dialog = await screen.findByRole("dialog", {
      name: "حفظ جميع القطع",
    });
    await userEvent.click(within(dialog).getByRole("button", { name: "نعم" }));

    expect(
      await screen.findByText("تم حفظ جميع القطع (3) بنجاح."),
    ).toBeInTheDocument();
    expect(requests[0].body.tags_config).toHaveLength(3);
    expect(await screen.findByText("3 من 3")).toBeInTheDocument();
  });

  test("فيه حفظ مؤقت ما انرسل: «ابدأ الجولة» معطّل", async () => {
    mockEventServer(makeEvent({ tags: readyTags }));
    renderPage();
    await ready();
    expect(screen.getByRole("button", { name: "ابدأ الجولة" })).toBeEnabled();

    await userEvent.type(screen.getByLabelText("نص التلميح"), "!");
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));

    expect(await screen.findByText(/مؤقتًا/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ابدأ الجولة" })).toBeDisabled();
  });
});

describe("شكل الصفحة", () => {
  const tagButton = (n) =>
    screen.getByRole("button", { name: new RegExp(`^القطعة ${n}،`) });

  test("القطعة المختارة دائمًا مميزة، و«قيد التعديل» بس لما التخصيص مسموح", async () => {
    mockEventServer(makeEvent({ status: "paused", tags: readyTags }));
    renderPage();
    await ready();

    // متوقفة بدون تعديل: مقفولة، بس الاختيار ظاهر
    await userEvent.click(tagButton(2));
    expect(tagButton(2)).toHaveClass("class-tag--current");
    expect(tagButton(2)).toHaveAttribute("aria-pressed", "true");
    expect(tagButton(1)).not.toHaveClass("class-tag--current");
    expect(screen.queryByText("قيد التعديل")).not.toBeInTheDocument();
  });

  test("في المسودة: القطعة المختارة المحفوظة تكتب «قيد التعديل»", async () => {
    mockEventServer(makeEvent({ tags: readyTags }));
    renderPage();
    await ready();

    expect(tagButton(1)).toHaveClass("class-tag--current");
    expect(tagButton(1)).toHaveTextContent("قيد التعديل");
  });

  test("«إنهاء الجولة» بإطار أحمر مو خلفية", async () => {
    mockEventServer(makeEvent({ status: "live", tags: readyTags }));
    renderPage();
    await ready();

    const stop = screen.getByRole("button", { name: "إنهاء الجولة" });
    expect(stop).toHaveClass("ui-button--outline", "round-stop");
    expect(stop).not.toHaveClass("ui-button--danger");
  });

  test("زر القلم بدون إطار", async () => {
    mockEventServer(makeEvent());
    renderPage();
    await ready();

    expect(
      screen.getByRole("button", { name: "تعديل اسم التجربة" }),
    ).toHaveClass("event-name-edit");
  });
});

describe("الجولة", () => {
  test("كل القطع جاهزة: «ابدأ الجولة» يشغّلها ويقفل التخصيص", async () => {
    const { requests } = mockEventServer(makeEvent({ tags: readyTags }));
    renderPage();
    await ready();

    await userEvent.click(screen.getByRole("button", { name: "ابدأ الجولة" }));

    expect(
      await screen.findByRole("button", { name: "إنهاء الجولة" }),
    ).toBeInTheDocument();
    expect(requests).toEqual([{ type: "patch", body: { status: "live" } }]);
    expect(screen.getByLabelText("نص التلميح")).toBeDisabled();
  });

  test("الجولة الشغّالة: «إنهاء الجولة» يسأل ثم يوقفها", async () => {
    const { requests } = mockEventServer(
      makeEvent({ status: "live", tags: readyTags }),
    );
    renderPage();
    await ready();

    await userEvent.click(screen.getByRole("button", { name: "إنهاء الجولة" }));
    const dialog = await screen.findByRole("dialog", { name: "إيقاف الجولة" });
    await userEvent.click(within(dialog).getByRole("button", { name: "نعم" }));

    expect(
      await screen.findByRole("button", { name: "ابدأ الجولة" }),
    ).toBeInTheDocument();
    expect(requests).toEqual([{ type: "patch", body: { status: "paused" } }]);
  });

  test("تراجع عن الإيقاف ما يرسل شي", async () => {
    const { requests } = mockEventServer(
      makeEvent({ status: "live", tags: readyTags }),
    );
    renderPage();
    await ready();

    await userEvent.click(screen.getByRole("button", { name: "إنهاء الجولة" }));
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "إلغاء",
      }),
    );

    expect(requests).toEqual([]);
  });

  test("فشل البدء: رسالة", async () => {
    mockEventServer(makeEvent({ tags: readyTags }));
    server.use(
      http.patch(`${API}/events/e1`, () =>
        HttpResponse.json({}, { status: 400 }),
      ),
    );
    renderPage();
    await ready();

    await userEvent.click(screen.getByRole("button", { name: "ابدأ الجولة" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "تعذر تحديث حالة الجولة.",
    );
  });
});

describe("الجولة المتوقفة: تعديل الباقة", () => {
  // يدخل وضع تعديل الباقة: «تعديل الباقة» ثم «نعم»
  async function startEditing() {
    await userEvent.click(screen.getByRole("button", { name: "تعديل الباقة" }));
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "نعم",
      }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("نص التلميح")).toBeEnabled(),
    );
  }

  test("الصيد المفتوح: تأكيد وتصفير، حفظ مؤقت لقطعتين، ثم «حفظ» مرة ثانية يرسلها بطلب واحد", async () => {
    const { requests } = mockEventServer(
      makeEvent({ status: "paused", tags: readyTags }),
    );
    renderPage();
    await ready();
    expect(screen.getByLabelText("نص التلميح")).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "تعديل الباقة" }));
    const dialog = await screen.findByRole("dialog", { name: "تعديل الباقة" });
    expect(dialog).toHaveTextContent("عدد التعديلات المتاحة: 3");
    await userEvent.click(within(dialog).getByRole("button", { name: "نعم" }));
    await waitFor(() =>
      expect(screen.getByLabelText("نص التلميح")).toBeEnabled(),
    );

    // القطعة 1: حفظ مؤقت، بدون أي طلب
    await userEvent.type(screen.getByLabelText("نص التلميح"), " جديد");
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));
    expect(
      await screen.findByText(
        "انحفظت القطعة 01 مؤقتًا. لما تخلص كل القطع اضغط «حفظ» مرة ثانية.",
      ),
    ).toBeInTheDocument();
    expect(requests.map((r) => r.type)).toEqual(["reset"]);
    expect(
      screen.getByRole("button", { name: /^القطعة 1،.*معدّلة ولم تُحفظ/ }),
    ).toBeInTheDocument();

    // القطعة 2
    await userEvent.click(screen.getByRole("button", { name: /^القطعة 2،/ }));
    await userEvent.type(screen.getByLabelText("نص التلميح"), "!");
    expect(screen.getByRole("button", { name: "حفظ" })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));

    // ما فيه تعديل على الحالية وفيه مؤقت: نفس الزر يفتح تأكيد الحفظ النهائي
    await userEvent.click(await screen.findByRole("button", { name: "حفظ" }));
    const confirm = await screen.findByRole("dialog", {
      name: "حفظ التعديلات",
    });
    expect(confirm).toHaveTextContent("هل ترغب في المتابعة وحفظ التعديلات؟");
    await userEvent.click(within(confirm).getByRole("button", { name: "نعم" }));

    expect(
      await screen.findByText("تم حفظ تعديلات الباقة بنجاح."),
    ).toBeInTheDocument();
    expect(requests.map((r) => r.type)).toEqual(["reset", "edit"]);
    expect(requests[1].body.tags_config.map((t) => t.tag_id)).toEqual([
      "t1",
      "t2",
      "t3",
    ]);
    expect(requests[1].body.tags_config[2]).toEqual({
      tag_id: "t3",
      tag_type: "clue",
      content: { hint: "تلميح 3" },
    });
    expect(await screen.findByText("2/3")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "إلغاء التعديل" }),
    ).not.toBeInTheDocument();
  });

  test("الحفظ المؤقت يبقى لما تتنقل بين القطع، والقطعة تعرض تعديلها", async () => {
    mockEventServer(
      makeEvent({ status: "paused", mode: "seq", tags: readyTags }),
    );
    renderPage();
    await ready();
    await startEditing();

    await userEvent.clear(screen.getByLabelText("نص التلميح"));
    await userEvent.type(screen.getByLabelText("نص التلميح"), "مكان جديد");
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));
    await userEvent.click(screen.getByRole("button", { name: /^القطعة 2،/ }));
    await userEvent.click(screen.getByRole("button", { name: /^القطعة 1،/ }));

    expect(screen.getByLabelText("نص التلميح")).toHaveValue("مكان جديد");
  });

  test("وضع التعديل: زرين «حفظ» و«إلغاء التعديل»، و«حفظ» متاح حتى بدون تعديل", async () => {
    mockEventServer(
      makeEvent({ status: "paused", mode: "seq", tags: readyTags }),
    );
    renderPage();
    await ready();
    await startEditing();

    const actions = document.querySelector(".customization-editor__actions");
    expect(
      within(actions)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["حفظ", "إلغاء التعديل"]);
    expect(screen.getByRole("button", { name: "حفظ" })).toBeEnabled();
  });

  test("بدون أي تعديل: «حفظ» يسأل، ثم يحفظ القطع مثل ما هي ويخصم تعديل", async () => {
    const { requests } = mockEventServer(
      makeEvent({ status: "paused", mode: "seq", tags: readyTags }),
    );
    renderPage();
    await ready();
    await startEditing();

    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));
    const confirm = await screen.findByRole("dialog", {
      name: "حفظ التعديلات",
    });
    expect(confirm).toHaveTextContent("هل ترغب في المتابعة وحفظ التعديلات؟");
    await userEvent.click(within(confirm).getByRole("button", { name: "نعم" }));

    expect(
      await screen.findByText("تم حفظ تعديلات الباقة بنجاح."),
    ).toBeInTheDocument();
    expect(requests).toHaveLength(1);
    expect(requests[0].type).toBe("edit");
    expect(requests[0].body.tags_config).toHaveLength(3);
    expect(await screen.findByText("2/3")).toBeInTheDocument();
  });

  test("قطعة فيها تلميح: «حفظ» يحفظ مؤقتًا مباشرة بدون تحذير", async () => {
    mockEventServer(
      makeEvent({ status: "paused", mode: "seq", tags: readyTags }),
    );
    renderPage();
    await ready();
    await startEditing();

    await userEvent.type(screen.getByLabelText("نص التلميح"), "!");
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));

    expect(
      await screen.findByText(/انحفظت القطعة 01 مؤقتًا/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("آخر تعديل: نفس سؤال الحفظ", async () => {
    mockEventServer(
      makeEvent({
        status: "paused",
        mode: "seq",
        edits_remaining: 1,
        tags: readyTags,
      }),
    );
    renderPage();
    await ready();
    await startEditing();

    await userEvent.type(screen.getByLabelText("نص التلميح"), "!");
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));
    await userEvent.click(await screen.findByRole("button", { name: "حفظ" }));

    expect(
      await screen.findByRole("dialog", { name: "حفظ التعديلات" }),
    ).toHaveTextContent("هل ترغب في المتابعة وحفظ التعديلات؟");
  });

  test("تراجع عن الحفظ النهائي ما يرسل شي", async () => {
    const { requests } = mockEventServer(
      makeEvent({ status: "paused", mode: "seq", tags: readyTags }),
    );
    renderPage();
    await ready();
    await startEditing();

    await userEvent.type(screen.getByLabelText("نص التلميح"), "!");
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));
    await userEvent.click(await screen.findByRole("button", { name: "حفظ" }));
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "إلغاء",
      }),
    );

    expect(requests).toEqual([]);
    expect(screen.getByRole("button", { name: "حفظ" })).toBeInTheDocument();
  });

  test("«إلغاء التعديل» مع حفظ مؤقت يفتح نافذة تأكيد (مو alert)، والموافقة تمسحه", async () => {
    const { requests } = mockEventServer(
      makeEvent({ status: "paused", mode: "seq", tags: readyTags }),
    );
    const alertConfirm = vi.spyOn(window, "confirm");
    renderPage();
    await ready();
    await startEditing();
    await userEvent.type(screen.getByLabelText("نص التلميح"), "!");
    await userEvent.click(screen.getByRole("button", { name: "حفظ" }));

    // تراجع: يبقى في وضع التعديل
    await userEvent.click(
      await screen.findByRole("button", { name: "إلغاء التعديل" }),
    );
    let dialog = await screen.findByRole("dialog", { name: "إلغاء التعديل" });
    expect(dialog).toHaveTextContent(
      "هل ترغب في إلغاء التعديل؟ التعديلات اللي ما انحفظت بتروح.",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "إلغاء" }),
    );
    expect(screen.getByLabelText("نص التلميح")).toBeEnabled();

    // موافقة: يطلع من التعديل ويرجع المحفوظ
    await userEvent.click(
      screen.getByRole("button", { name: "إلغاء التعديل" }),
    );
    dialog = await screen.findByRole("dialog", { name: "إلغاء التعديل" });
    await userEvent.click(within(dialog).getByRole("button", { name: "نعم" }));

    await waitFor(() =>
      expect(screen.getByLabelText("نص التلميح")).toBeDisabled(),
    );
    expect(screen.getByLabelText("نص التلميح")).toHaveValue("تلميح 1");
    expect(alertConfirm).not.toHaveBeenCalled();
    expect(requests).toEqual([]);
  });

  test("«إلغاء التعديل» مع تعديل ما انحفظ على القطعة الحالية يسأل كذلك", async () => {
    mockEventServer(
      makeEvent({ status: "paused", mode: "seq", tags: readyTags }),
    );
    renderPage();
    await ready();
    await startEditing();
    await userEvent.type(screen.getByLabelText("نص التلميح"), "!");

    await userEvent.click(
      screen.getByRole("button", { name: "إلغاء التعديل" }),
    );

    expect(
      await screen.findByRole("dialog", { name: "إلغاء التعديل" }),
    ).toBeInTheDocument();
  });

  test("«إلغاء التعديل» بدون أي تعديل: يطلع مباشرة بدون سؤال", async () => {
    const { requests } = mockEventServer(
      makeEvent({ status: "paused", mode: "seq", tags: readyTags }),
    );
    renderPage();
    await ready();

    await userEvent.click(screen.getByRole("button", { name: "تعديل الباقة" }));
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "نعم",
      }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "إلغاء التعديل" }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("نص التلميح")).toBeDisabled();
    expect(requests).toEqual([]);
  });

  test("بدون تعديلات متبقية: «تعديل الباقة» معطّل", async () => {
    mockEventServer(
      makeEvent({ status: "paused", edits_remaining: 0, tags: readyTags }),
    );
    renderPage();
    await ready();

    expect(screen.getByRole("button", { name: "تعديل الباقة" })).toBeDisabled();
  });
});

test("تعديل اسم الجولة من العنوان", async () => {
  const { requests } = mockEventServer(makeEvent());
  renderPage();
  await ready();

  await userEvent.click(
    screen.getByRole("button", { name: "تعديل اسم التجربة" }),
  );
  const input = screen.getByRole("textbox", { name: "اسم التجربة" });
  await userEvent.clear(input);
  await userEvent.type(input, "مكتب الشركة{Enter}");

  expect(await ready("مكتب الشركة")).toBeInTheDocument();
  expect(requests).toEqual([{ type: "patch", body: { title: "مكتب الشركة" } }]);
});

// خطأ معروف (وصول): بعد حفظ الاسم، useEventRename يرجّع التركيز لزر القلم داخل
// requestAnimationFrame. أحيانًا الإطار يجي قبل ما يرسم React الزر (ref = null)،
// فيضيع التركيز على body. الاختبار يشغّل requestAnimationFrame فورًا عشان يكشفها كل مرة.
// موجود كذلك في Dev (نفس الطريقة داخل CustomizationPage).
// test.fails = يصف السلوك الصحيح ويُتوقع فشله حتى ينصلح. بعد الإصلاح احذف .fails
test.fails("خطأ معروف: بعد حفظ الاسم يرجع التركيز لزر القلم", async () => {
  vi.stubGlobal("requestAnimationFrame", (callback) => {
    callback();
    return 0;
  });
  mockEventServer(makeEvent());
  renderPage();
  await ready();

  await userEvent.click(
    screen.getByRole("button", { name: "تعديل اسم التجربة" }),
  );
  const input = screen.getByRole("textbox", { name: "اسم التجربة" });
  await userEvent.clear(input);
  await userEvent.type(input, "مكتب الشركة{Enter}");
  await ready("مكتب الشركة");

  await waitFor(
    () =>
      expect(
        screen.getByRole("button", { name: "تعديل اسم التجربة" }),
      ).toHaveFocus(),
    {
      timeout: 500,
    },
  );
});
