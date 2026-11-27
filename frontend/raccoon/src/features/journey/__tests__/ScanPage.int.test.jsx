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
  server.use(
    http.post(`${API}/journey/scan`, () =>
      typeof scan === "function" ? scan() : HttpResponse.json(scan),
    ),
    http.get(`${API}/journey/leaderboard/e1`, () => HttpResponse.json(players)),
  );
}

const scanError =
  (detail, status = 400) =>
  () =>
    HttpResponse.json({ detail }, { status });

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

const player = (rank, overrides = {}) => ({
  user_hash: `u${rank}`,
  name: `لاعب ${rank}`,
  avatar_id: 1,
  score: 40 - rank,
  rank,
  ...overrides,
});

const title = (name) => screen.findByRole("heading", { level: 1, name });
const progress = () =>
  screen.getByRole("img", { name: /^خلصت \d+ من \d+ قطع$/ });

test("أثناء القراءة: «لحظة...»", async () => {
  mockScan(async () => delay("infinite"));
  renderScan();

  expect(await title("لحظة...")).toBeInTheDocument();
});

test("رابط ناقص: «رابط غير صالح»", async () => {
  renderScan("/scan?tag=tag3");

  expect(await title("رابط غير صالح")).toBeInTheDocument();
  expect(
    screen.getByRole("region", { name: "رابط غير صالح أو بيانات مفقودة." }),
  ).toBeInTheDocument();
});

describe("مسح ناجح", () => {
  test("«حصلتها!» برقم القطعة وتلميحها", async () => {
    mockScan(base);
    renderScan();

    expect(await title("حصلتها!")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "تلميح القطعة" }),
    ).toHaveTextContent("تحت الكرسي");
    expect(screen.getByText("جولة راكون")).toBeInTheDocument();
  });

  test("شريط التقدّم: المجموع = النقاط + الباقي لو الخادم ما أرسل total_tags", async () => {
    mockScan(base); // 5 نقاط + 4 باقية
    renderScan();

    await title("حصلتها!");
    const dots = progress();
    expect(dots).toHaveAccessibleName("خلصت 5 من 9 قطع");
    // eslint-disable-next-line testing-library/no-node-access -- النقاط زخرفة بلا role
    expect(dots.children).toHaveLength(9);
  });

  test("شريط التقدّم: total_tags من الخادم يغلب", async () => {
    mockScan({ ...base, current_score: 3, remaining_tags: 5, total_tags: 10 });
    renderScan();

    await title("حصلتها!");
    expect(progress()).toHaveAccessibleName("خلصت 5 من 10 قطع");
    // eslint-disable-next-line testing-library/no-node-access -- النقاط زخرفة بلا role
    expect(progress().children).toHaveLength(10);
  });

  test("آخر قطعة في التسلسلي: «خلصت!» بالكأس والتهنئة والمتصدرين", async () => {
    mockScan(
      {
        ...base,
        mode: "seq",
        event_finished: true,
        code: "completed",
        current_score: 9,
        remaining_tags: 0,
        total_tags: 9,
      },
      { players: [player(1), player(2, { user_hash: ME })] },
    );
    renderScan();

    expect(await title("خلصت!")).toBeInTheDocument();
    expect(progress()).toHaveAccessibleName("خلصت 9 من 9 قطع");
    await waitFor(() =>
      expect(
        screen.getByRole("region", { name: "المتصدرون" }),
      ).toHaveTextContent("أنت"),
    );
    expect(screen.getByText("9/9")).toBeInTheDocument();
    expect(screen.getByText("ألف مبروووك! لقيت كل القطع")).toBeInTheDocument();
    expect(
      screen.getByText("الآن خلصت الجولة، شوف ترتيبك في المتصدرين."),
    ).toBeInTheDocument();
    expect(screen.queryByText("حصلتها!")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "تلميح القطعة" }),
    ).not.toBeInTheDocument();
  });

  test("آخر قطعة في المفتوح: «خلصت!» بدون عدد (القطع موزّعة)", async () => {
    mockScan({
      ...base,
      event_finished: true,
      code: "completed",
      current_score: 4,
      remaining_tags: 0,
      total_tags: 9,
    });
    renderScan();

    expect(await title("خلصت!")).toBeInTheDocument();
    expect(
      screen.getByText("ألف مبروووك! آخر قطعة كانت من نصيبك"),
    ).toBeInTheDocument();
    expect(screen.queryByText("9/9")).not.toBeInTheDocument();
  });

  test("صورة التلميح تتكبّر", async () => {
    mockScan({
      ...base,
      content: { hint: "x", image: "https://cdn.test/h.png" },
    });
    renderScan();

    await userEvent.click(
      await screen.findByRole("button", { name: "تكبير صورة التلميح" }),
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  test("الجولة انتهت: للعرض فقط", async () => {
    mockScan({ ...base, status: "view_only", tag_type: "trap" });
    renderScan();

    expect(await title("انتهت الجولة")).toBeInTheDocument();
    expect(
      screen.getByText("هذه قطعة فخ. ما راح ينطبق أي تأثير."),
    ).toBeInTheDocument();
  });

  test("رد فاضي: «ما فيه شي»", async () => {
    mockScan(() => HttpResponse.json(null));
    renderScan();

    expect(await title("ما فيه شي")).toBeInTheDocument();
  });
});

describe("المتصدرون", () => {
  const topTen = Array.from({ length: 10 }, (_, index) => player(index + 1));

  test("الصغيرة: أول 2 وصفّي لو أنا برا الثلاثة، و«كبّر» يعرض 10", async () => {
    mockScan(base, {
      players: [...topTen, player(14, { user_hash: ME, name: "عبدالرحمن" })],
    });
    renderScan();

    const sheet = await screen.findByRole("region", { name: "المتصدرون" });
    await waitFor(() =>
      expect(within(sheet).getAllByRole("listitem")).toHaveLength(3),
    );

    let rows = within(sheet).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("لاعب 1");
    expect(rows[1]).toHaveTextContent("لاعب 2");
    expect(rows[2]).toHaveTextContent("14");
    expect(rows[2]).toHaveTextContent("أنت");
    expect(rows[2]).toHaveAttribute("aria-current", "true");

    await userEvent.click(within(sheet).getByRole("button", { name: "كبّر" }));

    // الكبيرة: أول 9 وصفّي (10 صفوف)
    await waitFor(() =>
      expect(within(sheet).getAllByRole("listitem")).toHaveLength(10),
    );
    rows = within(sheet).getAllByRole("listitem");
    expect(rows[8]).toHaveTextContent("لاعب 9");
    expect(rows[9]).toHaveTextContent("أنت");
    expect(
      within(sheet).getByRole("button", { name: "صغّر" }),
    ).toBeInTheDocument();
  });

  test("أنا من الثلاثة الأوائل: ما يتكرر صفّي", async () => {
    const list = topTen.map((item) =>
      item.rank === 2 ? { ...item, user_hash: ME } : item,
    );
    mockScan(base, { players: list });
    renderScan();

    const sheet = await screen.findByRole("region", { name: "المتصدرون" });
    await waitFor(() =>
      expect(within(sheet).getAllByRole("listitem")).toHaveLength(3),
    );

    const rows = within(sheet).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("لاعب 1"),
      expect.stringContaining("أنت"),
      expect.stringContaining("لاعب 3"),
    ]);
  });

  test("ما فيه لاعبين: رسالة", async () => {
    mockScan(base, { players: [] });
    renderScan();

    const sheet = await screen.findByRole("region", { name: "المتصدرون" });
    expect(
      await within(sheet).findByText("لا يوجد مشاركون بعد."),
    ).toBeInTheDocument();
  });
});

describe("الفخاخ", () => {
  const trap = (content, extra) => ({
    ...base,
    tag_type: "trap",
    content,
    ...extra,
  });

  test("بووم: كانت 5 صارت 4", async () => {
    mockScan(trap({ boom: 1 }, { current_score: 4 }));
    renderScan();

    expect(await title("بووم!")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "تفاصيل الخصم" }),
    ).toHaveTextContent("كانت 5 · صارت 4");
  });

  test("تجميد: عدّاد ثم «انفكّ التجميد!»", async () => {
    mockScan(
      trap(
        { freeze: 1 },
        { frozen_until: new Date(Date.now() + 1000).toISOString() },
      ),
    );
    renderScan();

    expect(await title("تجمّدت!")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "العدّاد" })).toBeInTheDocument();

    await waitFor(
      () =>
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
          "انفكّ التجميد!",
        ),
      { timeout: 2500 },
    );
  });

  test("فخ فاضي", async () => {
    mockScan(trap({}));
    renderScan();

    expect(await title("قطعة فخ")).toBeInTheDocument();
    expect(screen.getByText("الفخ فاضي")).toBeInTheDocument();
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
      const bodies = mockSetTrap(() =>
        HttpResponse.json({ content: { was_choose: true, freeze: 60 } }),
      );
      renderScan();

      expect(await title("اختر الفخ!")).toBeInTheDocument();
      await userEvent.click(
        screen.getByRole("button", { name: "ازرع فخ التجميد · 60 ث" }),
      );

      expect(await title("زرعته!")).toBeInTheDocument();
      expect(
        screen.getByRole("region", { name: "أول واحد يمسحها بعدك بيتجمّد" }),
      ).toBeInTheDocument();
      expect(bodies).toEqual([
        {
          tag_hash: "tag3",
          injected_user_hash: ME,
          trap_type: "freeze",
          trap_value: 60,
        },
      ]);
    });

    test("تختار مدة ثانية (120 ث)", async () => {
      mockScan(trap({ choose: true }));
      const bodies = mockSetTrap(() =>
        HttpResponse.json({ content: { was_choose: true, freeze: 120 } }),
      );
      renderScan();

      await userEvent.click(
        await screen.findByRole("radio", { name: "120 ث" }),
      );
      await userEvent.click(
        screen.getByRole("button", { name: "ازرع فخ التجميد · 120 ث" }),
      );

      await title("زرعته!");
      expect(bodies[0]).toMatchObject({ trap_type: "freeze", trap_value: 120 });
    });

    test("بووم قيمته 1", async () => {
      mockScan(trap({ choose: true }));
      const bodies = mockSetTrap(() =>
        HttpResponse.json({ content: { was_choose: true, boom: 1 } }),
      );
      renderScan();

      await userEvent.click(await screen.findByRole("radio", { name: /بووم/ }));
      await userEvent.click(
        screen.getByRole("button", { name: /ازرع فخ بووم/ }),
      );

      expect(await title("زرعته!")).toBeInTheDocument();
      expect(
        screen.getByRole("region", { name: "أول واحد يمسحها بعدك يخسر نقطة" }),
      ).toBeInTheDocument();
      expect(bodies[0]).toMatchObject({ trap_type: "boom", trap_value: 1 });
    });

    test("فشل الزرع: رسالة الخادم", async () => {
      mockScan(trap({ choose: true }));
      mockSetTrap(() =>
        HttpResponse.json(
          { detail: { message: "Trap already set" } },
          { status: 400 },
        ),
      );
      renderScan();

      await userEvent.click(
        await screen.findByRole("button", { name: /ازرع فخ التجميد/ }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Trap already set",
      );
    });
  });
});

describe("المسح مرفوض", () => {
  test.each([
    [
      {
        code: "already_scanned",
        message: "x",
        content: { hint: "تحت الكرسي" },
        current_score: 5,
      },
      "حقتك من قبل",
      "هذا تلميح القطعة مرة ثانية — نقاطك ما تغيّرت.",
    ],
    [
      {
        code: "claimed_by_another_player",
        message: "Sorry, نورة claimed this tag before you!",
      },
      "سبقك غيرك!",
      "سبقك لهذي القطعة",
    ],
    [
      {
        code: "skipped_tag",
        message: "Skipped tag! You must scan tag 4 first.",
      },
      "مو بالترتيب!",
      "04",
    ],
    [
      { message: "This event is not live.", mode: "open" },
      "استعد!",
      "ننتظر المنظم يبدأ الجولة",
    ],
    [
      { message: "Security Violation: not your link" },
      "مو رابطك!",
      "امسح القطعة بجوالك عشان تفتحها",
    ],
    [
      {
        code: "completed",
        message: "You have already completed this event!",
        total_tags: 9,
      },
      "خلصت!",
      "أنت خلصت هذي الجولة من قبل",
    ],
    [
      { code: "tag_not_configured", message: "Tag not configured" },
      "ما عرفناها!",
      "تأكد إنها من قطع الجولة",
    ],
    [
      { code: "unknown", message: "Server exploded" },
      "ما عرفناها!",
      "تأكد إنها من قطع الجولة",
    ],
  ])("%j", async (detail, heading, text) => {
    mockScan(scanError(detail));
    renderScan();

    expect(await title(heading)).toBeInTheDocument();
    expect(screen.getAllByText(text, { exact: false }).length).toBeGreaterThan(
      0,
    );
  });

  test("اسم اللاعب اللي سبقك يظهر", async () => {
    mockScan(
      scanError({
        code: "claimed_by_another_player",
        message: "Sorry, نورة claimed this tag before you!",
      }),
    );
    renderScan();

    await title("سبقك غيرك!");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "نورة سبقك لهذي القطعة",
    );
  });

  test("خلصت الجولة: الكأس فيه المجموع", async () => {
    mockScan(scanError({ code: "completed", message: "x", total_tags: 9 }));
    renderScan();

    await title("خلصت!");
    expect(screen.getByText("9/9")).toBeInTheDocument();
  });

  test("detail نصي من الخادم", async () => {
    mockScan(scanError("This event is not live."));
    renderScan();

    expect(await title("استعد!")).toBeInTheDocument();
  });

  test("متجمّد من فخ سابق", async () => {
    mockScan(
      scanError({
        code: "freeze",
        message: "Frozen",
        frozen_until: new Date(Date.now() + 60_000).toISOString(),
        current_score: 2,
      }),
    );
    renderScan();

    expect(await title("تجمّدت!")).toBeInTheDocument();
  });
});
