import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import { Route, Routes } from "react-router-dom";
import { describe, expect, test } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import ScanPage from "../ScanPage";

const ME = "u8hash01";

function renderScan(route = `/scan?tag=tag3&sig=${ME}`) {
  return renderWithProviders(
    <Routes>
      <Route path="/scan" element={<ScanPage />} />
      <Route path="/home" element={<p>الرئيسية</p>} />
    </Routes>,
    { route },
  );
}

// رد المسح، والمتصدرين للجولة e1
function mockScan(scan, { players = [] } = {}) {
  const trapRequests = [];
  server.use(
    http.post(`${API}/journey/scan`, () =>
      typeof scan === "function" ? scan() : HttpResponse.json(scan),
    ),
    http.get(`${API}/journey/leaderboard/e1`, () => HttpResponse.json(players)),
  );
  return trapRequests;
}

const scanError = (detail, status = 400) => () => HttpResponse.json({ detail }, { status });

const base = {
  status: "success",
  event_id: "e1",
  tag_type: "clue",
  tag_sequence: 3,
  current_score: 5,
  remaining_tags: 4,
  mode: "open",
  content: { hint: "تحت الكرسي" },
};

const players = [
  { user_hash: "x1", name: "نورة", score: 7 },
  { user_hash: ME, name: "عبدالرحمن", score: 5 },
];

const title = (name) => screen.findByRole("heading", { level: 1, name });

test("أثناء القراءة: «لحظة...»", async () => {
  mockScan(async () => delay("infinite"));
  renderScan();

  expect(await title("لحظة...")).toBeInTheDocument();
  expect(screen.getByText("جاري قراءة القطعة")).toBeInTheDocument();
});

test("رابط ناقص: رسالة وزر الرئيسية", async () => {
  const { location } = renderScan("/scan?tag=tag3");

  expect(await title("رابط غير صالح")).toBeInTheDocument();
  expect(screen.getByText("رابط غير صالح أو بيانات مفقودة.")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "رجوع للرئيسية" }));
  expect(location.current.pathname).toBe("/home");
});

describe("مسح ناجح", () => {
  test("صيد مفتوح: «حصلتها!» والتلميح والنقاط", async () => {
    mockScan(base);
    renderScan();

    expect(await title("حصلتها!")).toBeInTheDocument();
    expect(screen.getByText("القطعة 03 صارت لك")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "تلميح القطعة" })).toHaveTextContent("تحت الكرسي");
    expect(screen.getByText(/نقاطك/)).toHaveTextContent("نقاطك 5");
    expect(screen.getByText(/باقي/)).toHaveTextContent("باقي 4 قطع");
    expect(screen.getByText("جولة راكون")).toBeInTheDocument();
  });

  test("تسلسلي: رقم القطعة من المجموع", async () => {
    mockScan({ ...base, mode: "seq" });
    renderScan();

    expect(await screen.findByText("القطعة 5 من 9")).toBeInTheDocument();
  });

  test("المتصدرون: الإكليل يعرض ترتيبي، والقائمة تميّزني بـ«أنت»", async () => {
    mockScan(base, { players });
    renderScan();

    const rank = await screen.findByRole("button", { name: "المتصدرون — ترتيبك 2" });
    expect(rank).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(rank);

    const sheet = await screen.findByRole("dialog", { name: "المتصدرون" });
    const rows = within(sheet).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("نورة");
    expect(rows[1]).toHaveTextContent("أنت");
    expect(rows[1]).toHaveAttribute("aria-current", "true");

    await userEvent.click(within(sheet).getByRole("button", { name: "إغلاق" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("صورة التلميح تتكبّر", async () => {
    mockScan({ ...base, content: { hint: "x", image: "https://cdn.test/h.png" } });
    renderScan();

    await userEvent.click(await screen.findByRole("button", { name: "تكبير صورة التلميح" }));

    expect(await screen.findByRole("dialog", { name: "صورة التلميح" })).toBeInTheDocument();
  });

  test("آخر قطعة: «خلصتها!» وزر المتصدرين", async () => {
    mockScan({ ...base, event_finished: true, current_score: 9, remaining_tags: 0 }, { players });
    renderScan();

    expect(await title("خلصتها!")).toBeInTheDocument();
    expect(screen.getByText("9/9")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "شوف المتصدرين" }));
    expect(await screen.findByRole("dialog", { name: "المتصدرون" })).toBeInTheDocument();
  });

  test("الجولة انتهت: للعرض فقط", async () => {
    mockScan({ ...base, status: "view_only", tag_type: "trap" });
    renderScan();

    expect(await title("انتهت الجولة")).toBeInTheDocument();
    expect(screen.getByText("للعرض فقط · ما تنحسب نقاط")).toBeInTheDocument();
    expect(screen.getByText("هذه قطعة فخ. ما راح ينطبق أي تأثير.")).toBeInTheDocument();
  });

  test("رد فاضي: «ما فيه شي»", async () => {
    mockScan(() => HttpResponse.json(null));
    renderScan();

    expect(await title("ما فيه شي")).toBeInTheDocument();
  });
});

describe("الفخاخ", () => {
  const trap = (content, extra) => ({ ...base, tag_type: "trap", content, ...extra });

  test("بووم: خسر نقطة", async () => {
    mockScan(trap({ boom: 1 }, { current_score: 4 }));
    renderScan();

    expect(await title("بووم!")).toBeInTheDocument();
    expect(screen.getByText("خسرت نقطة · صارت نقاطك 4")).toBeInTheDocument();
  });

  test("تجميد: عدّاد ثم «انفكّ التجميد!»", async () => {
    mockScan(trap({ freeze: 1 }, { frozen_until: new Date(Date.now() + 1000).toISOString() }));
    renderScan();

    expect(await title("تجمّدت!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /كمّل اللعب بعد/ })).toBeDisabled();

    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("انفكّ التجميد!"), {
      timeout: 2500,
    });
    expect(screen.getByRole("button", { name: "كمّل البحث" })).toBeEnabled();
  });

  test("فخ فاضي", async () => {
    mockScan(trap({}));
    renderScan();

    expect(await title("قطعة فخ")).toBeInTheDocument();
  });

  describe("اختر الفخ", () => {
    function mockSetTrap(response) {
      const bodies = [];
      server.use(
        http.post(`${API}/journey/set-trap`, async ({ request }) => {
          bodies.push(await request.json());
          return response();
        }),
      );
      return bodies;
    }

    test("تجميد بالمدة الافتراضية: يزرع ويعرض «زرعته!»", async () => {
      mockScan(trap({ choose: true }));
      const bodies = mockSetTrap(() => HttpResponse.json({ content: { was_choose: true, freeze: 60 } }));
      renderScan();

      expect(await title("اختر الفخ!")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "ازرع فخ التجميد · 60 ث" }));

      expect(await title("زرعته!")).toBeInTheDocument();
      expect(screen.getByText("فخ تجميد 60 ث على القطعة 03")).toBeInTheDocument();
      expect(bodies).toEqual([
        { tag_hash: "tag3", injected_user_hash: ME, trap_type: "freeze", trap_value: 60 },
      ]);
    });

    test("بووم قيمته 1", async () => {
      mockScan(trap({ choose: true }));
      const bodies = mockSetTrap(() => HttpResponse.json({ content: { was_choose: true, boom: 1 } }));
      renderScan();

      await userEvent.click(await screen.findByRole("radio", { name: /بووم/ }));
      await userEvent.click(screen.getByRole("button", { name: "ازرع فخ بووم" }));

      expect(await screen.findByText("فخ بووم على القطعة 03")).toBeInTheDocument();
      expect(bodies[0]).toMatchObject({ trap_type: "boom", trap_value: 1 });
    });

    test("مدة غلط تقفل الزر", async () => {
      mockScan(trap({ choose: true }));
      renderScan();

      const seconds = await screen.findByRole("spinbutton", { name: "مدة التجميد بالثواني" });
      await userEvent.clear(seconds);

      expect(screen.getByRole("button", { name: "ازرع فخ التجميد · — ث" })).toBeDisabled();
    });

    test("فشل الزرع: رسالة الخادم", async () => {
      mockScan(trap({ choose: true }));
      mockSetTrap(() => HttpResponse.json({ detail: { message: "Trap already set" } }, { status: 400 }));
      renderScan();

      await userEvent.click(await screen.findByRole("button", { name: /ازرع فخ التجميد/ }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Trap already set");
    });
  });
});

describe("المسح مرفوض", () => {
  test.each([
    [{ code: "already_scanned", message: "x", content: { hint: "تحت الكرسي" }, current_score: 5 }, "حقتك من قبل", "هذا تلميح القطعة مرة ثانية — نقاطك ما تغيّرت."],
    [{ code: "claimed_by_another_player", message: "Sorry, نورة claimed this tag before you!" }, "سبقك غيرك!", "سبقك لهذي القطعة"],
    [{ code: "skipped_tag", message: "Skipped tag! You must scan tag 4 first." }, "مو بالترتيب!", "امسح القطعة 04 أول"],
    [{ code: "unknown", message: "This event is not live." }, "استعد!", "ننتظر المنظّم يبدأ الجولة"],
    [{ code: "unknown", message: "Security Violation: not your link" }, "مو رابطك!", "هذا الرابط مو لك"],
    [{ code: "unknown", message: "You have already completed this event." }, "خلصتها!", "أنت خلصت هذي الجولة من قبل"],
    [{ code: "unknown", message: "Server exploded" }, "ما ضبطت!", "Server exploded"],
  ])("%j", async (detail, heading, text) => {
    mockScan(scanError(detail));
    renderScan();

    expect(await title(heading)).toBeInTheDocument();
    expect(screen.getByText(text, { exact: false })).toBeInTheDocument();
  });

  test("اسم اللاعب اللي سبقك يظهر", async () => {
    mockScan(scanError({ code: "claimed_by_another_player", message: "Sorry, نورة claimed this tag before you!" }));
    renderScan();

    await title("سبقك غيرك!");
    expect(screen.getByText("نورة").closest("strong, p, span")).toHaveTextContent("نورة سبقك لهذي القطعة");
  });

  test("detail نصي من الخادم", async () => {
    mockScan(scanError("This event is not live."));
    renderScan();

    expect(await title("استعد!")).toBeInTheDocument();
  });

  test("متجمّد من فخ سابق", async () => {
    mockScan(scanError({ code: "freeze", message: "Frozen", frozen_until: new Date(Date.now() + 60_000).toISOString(), current_score: 2 }));
    renderScan();

    expect(await title("تجمّدت!")).toBeInTheDocument();
  });

  test("«كمّل البحث» يرجع للرئيسية", async () => {
    mockScan(scanError({ code: "claimed_by_another_player", message: "x" }));
    const { location } = renderScan();

    await userEvent.click(await screen.findByRole("button", { name: "كمّل البحث" }));

    expect(location.current.pathname).toBe("/home");
  });
});
