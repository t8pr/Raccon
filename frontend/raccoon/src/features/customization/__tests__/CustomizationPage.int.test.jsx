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
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:preview", revokeObjectURL: () => {} }));
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

const ready = (name = "جولة يوم التأسيس") => screen.findByRole("heading", { level: 1, name });
const configured = (n, overrides) => makeTag(n, { is_configured: true, content: { hint: `تلميح ${n}` }, ...overrides });
const readyTags = [configured(1), configured(2), configured(3)];

describe("حالات التحميل", () => {
  test("بدون رقم جولة", async () => {
    renderPage("/customization");

    expect(await screen.findByText("اختر جولة من صفحة باقاتي.")).toBeInTheDocument();
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
        return attempts === 1 ? HttpResponse.json({}, { status: 500 }) : HttpResponse.json(makeEvent());
      }),
    );
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("حدث خطأ عند استرجاع معلومات الباقه.");
    await userEvent.click(screen.getByRole("button", { name: "حاول مرة أخرى" }));

    expect(await ready()).toBeInTheDocument();
  });
});

describe("مسودة: حفظ القطع", () => {
  test("يعرض القطعة الأولى والتقدم وعدد التعديلات", async () => {
    mockEventServer(makeEvent());
    renderPage();
    await ready();

    expect(screen.getByRole("heading", { name: "القطعة 01" })).toBeInTheDocument();
    expect(screen.getByText("0 من 3")).toBeInTheDocument();
    expect(screen.getByText("3/3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ابدأ الجولة" })).toBeDisabled();
    expect(screen.getByText("احفظ جميع القطع لتتمكن من بدء الجولة، حتى القطع الفارغة")).toBeInTheDocument();
  });

  test("كتابة تلميح وحفظ القطعة", async () => {
    const { requests } = mockEventServer(makeEvent());
    renderPage();
    await ready();

    await userEvent.type(screen.getByLabelText("نص التلميح"), "تحت الكرسي");
    expect(screen.getByText("10/255")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "احفظ القطعة" }));

    expect(await screen.findByText("انحفظت القطعة 01 بنجاح")).toBeInTheDocument();
    expect(requests).toEqual([
      { type: "setup", body: { tags_config: [{ tag_id: "t1", tag_type: "clue", content: { hint: "تحت الكرسي" } }] } },
    ]);
    expect(await screen.findByText("1 من 3")).toBeInTheDocument();
  });

  test("فخ تجميد: مدة غلط تقفل الحفظ، والمدة الصحيحة تنحفظ", async () => {
    const { requests } = mockEventServer(makeEvent());
    renderPage();
    await ready();

    await userEvent.click(screen.getByRole("radio", { name: /^تجميد/ }));
    const seconds = screen.getByRole("spinbutton", { name: "مدة التجميد بالثواني" });
    await userEvent.clear(seconds);
    await userEvent.type(seconds, "500");
    expect(screen.getByRole("button", { name: "احفظ القطعة" })).toBeDisabled();

    await userEvent.clear(seconds);
    await userEvent.type(seconds, "45");
    await userEvent.click(screen.getByRole("button", { name: "احفظ القطعة" }));

    await screen.findByText("انحفظت القطعة 01 بنجاح");
    expect(requests[0].body.tags_config[0]).toEqual({ tag_id: "t1", tag_type: "trap", content: { freeze: 45 } });
  });

  test("التسلسلي ما فيه فخاخ", async () => {
    mockEventServer(makeEvent({ mode: "seq" }));
    renderPage();
    await ready();

    expect(screen.queryByRole("group", { name: /الفخ/ })).not.toBeInTheDocument();
  });

  test("صورة التلميح: تنرفع عند الحفظ، والقطعة تحفظ رابطها", async () => {
    const { requests } = mockEventServer(makeEvent());
    const { container } = renderPage();
    await ready();

    const file = new File(["png"], "hint.png", { type: "image/png" });
    await userEvent.upload(container.querySelector('input[type="file"]'), file);
    expect(await screen.findByRole("img", { name: "تلميح" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "احفظ القطعة" }));

    await screen.findByText("انحفظت القطعة 01 بنجاح");
    expect(requests.map((r) => r.type)).toEqual(["upload", "setup"]);
    expect(requests[1].body.tags_config[0].content).toEqual({ hint: "", image: "https://cdn.test/hint.png" });
  });

  test("الانتقال لقطعة ثانية مع تعديلات غير محفوظة يسأل أول", async () => {
    mockEventServer(makeEvent());
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderPage();
    await ready();

    await userEvent.type(screen.getByLabelText("نص التلميح"), "x");
    await userEvent.click(screen.getByRole("button", { name: /^القطعة 2،/ }));
    expect(screen.getByRole("heading", { name: "القطعة 01" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^القطعة 2،/ }));
    expect(screen.getByRole("heading", { name: "القطعة 02" })).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  test("«حفظ جميع القطع» يسأل ثم يحفظ الكل في طلب واحد", async () => {
    const { requests } = mockEventServer(makeEvent());
    renderPage();
    await ready();

    await userEvent.click(screen.getByRole("button", { name: "حفظ جميع القطع" }));
    const dialog = await screen.findByRole("dialog", { name: "حفظ جميع القطع" });
    expect(dialog).toHaveTextContent("هل أنت متأكد من حفظ جميع القطع، بما فيها الفارغة؟");
    await userEvent.click(within(dialog).getByRole("button", { name: "نعم" }));

    expect(await screen.findByText("تم حفظ جميع القطع (3) بنجاح.")).toBeInTheDocument();
    expect(requests[0].body.tags_config).toHaveLength(3);
    expect(await screen.findByText("3 من 3")).toBeInTheDocument();
  });
});

describe("الجولة", () => {
  test("كل القطع جاهزة: «ابدأ الجولة» يشغّلها ويقفل التخصيص", async () => {
    const { requests } = mockEventServer(makeEvent({ tags: readyTags }));
    renderPage();
    await ready();

    await userEvent.click(screen.getByRole("button", { name: "ابدأ الجولة" }));

    expect(await screen.findByRole("button", { name: "إنهاء الجولة" })).toBeInTheDocument();
    expect(requests).toEqual([{ type: "patch", body: { status: "live" } }]);
    expect(screen.getByLabelText("نص التلميح")).toBeDisabled();
  });

  test("الجولة الشغّالة: «إنهاء الجولة» يسأل ثم يوقفها", async () => {
    const { requests } = mockEventServer(makeEvent({ status: "live", tags: readyTags }));
    renderPage();
    await ready();

    await userEvent.click(screen.getByRole("button", { name: "إنهاء الجولة" }));
    const dialog = await screen.findByRole("dialog", { name: "إيقاف الجولة" });
    await userEvent.click(within(dialog).getByRole("button", { name: "نعم" }));

    expect(await screen.findByRole("button", { name: "ابدأ الجولة" })).toBeInTheDocument();
    expect(requests).toEqual([{ type: "patch", body: { status: "paused" } }]);
  });

  test("تراجع عن الإيقاف ما يرسل شي", async () => {
    const { requests } = mockEventServer(makeEvent({ status: "live", tags: readyTags }));
    renderPage();
    await ready();

    await userEvent.click(screen.getByRole("button", { name: "إنهاء الجولة" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "إلغاء" }));

    expect(requests).toEqual([]);
  });

  test("فشل البدء: رسالة", async () => {
    mockEventServer(makeEvent({ tags: readyTags }));
    server.use(http.patch(`${API}/events/e1`, () => HttpResponse.json({}, { status: 400 })));
    renderPage();
    await ready();

    await userEvent.click(screen.getByRole("button", { name: "ابدأ الجولة" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("تعذر تحديث حالة الجولة.");
  });
});

describe("الجولة المتوقفة: تعديل الباقة", () => {
  test("الصيد المفتوح: تأكيد، تصفير، تعديل، ثم حفظ يستهلك تعديل", async () => {
    const { requests } = mockEventServer(makeEvent({ status: "paused", tags: readyTags }));
    renderPage();
    await ready();
    expect(screen.getByLabelText("نص التلميح")).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "تعديل الباقة" }));
    const dialog = await screen.findByRole("dialog", { name: "تعديل الباقة" });
    expect(dialog).toHaveTextContent("عدد التعديلات المتاحة: 3");
    await userEvent.click(within(dialog).getByRole("button", { name: "نعم" }));

    await waitFor(() => expect(screen.getByLabelText("نص التلميح")).toBeEnabled());
    expect(screen.getByRole("button", { name: "إلغاء التعديل" })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("نص التلميح"), " جديد");
    await userEvent.click(screen.getByRole("button", { name: "احفظ القطعة" }));

    await screen.findByText("انحفظت القطعة 01 بنجاح");
    expect(requests.map((r) => r.type)).toEqual(["reset", "edit"]);
    expect(await screen.findByText("2/3")).toBeInTheDocument();
  });

  test("«إلغاء التعديل» يرجع القفل بدون حفظ", async () => {
    const { requests } = mockEventServer(makeEvent({ status: "paused", mode: "seq", tags: readyTags }));
    renderPage();
    await ready();

    await userEvent.click(screen.getByRole("button", { name: "تعديل الباقة" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "نعم" }));
    await userEvent.click(await screen.findByRole("button", { name: "إلغاء التعديل" }));

    expect(screen.getByLabelText("نص التلميح")).toBeDisabled();
    expect(requests).toEqual([]);
  });

  test("آخر تعديل: تحذير ثم «تأكيد الحفظ»", async () => {
    const { requests } = mockEventServer(makeEvent({ status: "paused", mode: "seq", edits_remaining: 1, tags: readyTags }));
    renderPage();
    await ready();

    await userEvent.click(screen.getByRole("button", { name: "تعديل الباقة" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "نعم" }));
    await userEvent.type(await screen.findByLabelText("نص التلميح"), "!");
    await userEvent.click(screen.getByRole("button", { name: "احفظ القطعة" }));

    expect(await screen.findByText(/هذا آخر تعديل متاح لك/)).toBeInTheDocument();
    expect(requests).toEqual([]);

    await userEvent.click(screen.getByRole("button", { name: "تأكيد الحفظ" }));
    await screen.findByText("انحفظت القطعة 01 بنجاح");
    expect(requests.map((r) => r.type)).toEqual(["edit"]);
  });

  test("بدون تعديلات متبقية: «تعديل الباقة» معطّل", async () => {
    mockEventServer(makeEvent({ status: "paused", edits_remaining: 0, tags: readyTags }));
    renderPage();
    await ready();

    expect(screen.getByRole("button", { name: "تعديل الباقة" })).toBeDisabled();
  });
});

test("تعديل اسم الجولة من العنوان", async () => {
  const { requests } = mockEventServer(makeEvent());
  renderPage();
  await ready();

  await userEvent.click(screen.getByRole("button", { name: "تعديل اسم التجربة" }));
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

  await userEvent.click(screen.getByRole("button", { name: "تعديل اسم التجربة" }));
  const input = screen.getByRole("textbox", { name: "اسم التجربة" });
  await userEvent.clear(input);
  await userEvent.type(input, "مكتب الشركة{Enter}");
  await ready("مكتب الشركة");

  await waitFor(() => expect(screen.getByRole("button", { name: "تعديل اسم التجربة" })).toHaveFocus(), {
    timeout: 500,
  });
});
