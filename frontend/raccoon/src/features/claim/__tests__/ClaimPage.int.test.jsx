import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import { Route, Routes } from "react-router-dom";
import { describe, expect, test } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { makeEvent, makePack, testUser } from "../../../test/fixtures";
import { renderWithProviders } from "../../../test/renderWithProviders";
import ClaimPage from "../ClaimPage";

const HASH = "q8Zr_abc-1";

function renderClaim({ hash = HASH, ...options } = {}) {
  return renderWithProviders(
    <Routes>
      <Route path="/claim/:masterAuthHash" element={<ClaimPage />} />
      <Route path="/login" element={<p>صفحة الدخول</p>} />
      <Route path="/register" element={<p>صفحة التسجيل</p>} />
      <Route path="/packages" element={<p>صفحة باقاتي</p>} />
      <Route path="/customization/:id" element={<p>صفحة التخصيص</p>} />
    </Routes>,
    { route: `/claim/${hash}`, ...options },
  );
}

function mockServer({
  preview = () => HttpResponse.json(makePack()),
  claim,
  events = [],
} = {}) {
  server.use(
    http.get(`${API}/packs/preview/:hash`, () => preview()),
    http.post(`${API}/packs/claim`, () => claim()),
    http.get(`${API}/events`, () => HttpResponse.json(events)),
  );
}

const heading = () => screen.findByRole("heading", { level: 1 });

test("رابط بصيغة غلط", async () => {
  renderClaim({ hash: "bad.hash" });

  expect(await heading()).toHaveTextContent("رابط الاستلام غير صالح");
  expect(screen.getByRole("alert")).toHaveTextContent(
    "تأكد من فتح الرابط الكامل الذي وصلك في الإيميل.",
  );
});

test("أثناء التحقق", async () => {
  mockServer({ preview: async () => delay("infinite") });
  renderClaim();

  expect(
    await screen.findByText("جارٍ التحقق من الباكج والحساب..."),
  ).toBeInTheDocument();
});

describe("زائر", () => {
  test("يشوف تفاصيل الباكج، و«إنشاء حساب» يحفظ رابط الرجوع", async () => {
    mockServer();
    const { location } = renderClaim({ token: null });

    // «استلم باكجك» نفس عنوان حالة التحقق، فننتظر تفاصيل الباكج نفسها
    expect(await screen.findByText("صيد مفتوح")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "استلم باكجك" }),
    ).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "إنشاء حساب" }));

    expect(location.current.pathname).toBe("/register");
    expect(
      JSON.parse(sessionStorage.getItem("raccoon_claim_return")).path,
    ).toBe(`/claim/${HASH}`);
  });

  test("«تسجيل الدخول»", async () => {
    mockServer();
    const { location } = renderClaim({ token: null });

    await userEvent.click(
      await screen.findByRole("button", { name: "تسجيل الدخول" }),
    );

    expect(location.current.pathname).toBe("/login");
  });
});

describe("مستخدم داخل", () => {
  test("يربط الباكج، تظهر التهنئة، و«جهّزها الحين» يفتح التخصيص", async () => {
    mockServer({
      claim: () => HttpResponse.json(makePack({ owner_id: testUser.id })),
      events: [makeEvent({ id: "e1", pack_id: 11 })],
    });
    const { location } = renderClaim();

    expect(
      await screen.findByRole("heading", {
        name: "حزمتك جاهزة، باقي نربطها باسمك",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/أنت داخل باسم عبدالرحمن/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "اربطه بحسابي" }));

    expect(
      await screen.findByRole("heading", {
        name: "ألف مبروك، تم ربط الحزمة بك!",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("تم ربطه بحسابك")).toBeInTheDocument();

    const customize = screen.getByRole("button", { name: "جهّزها الحين" });
    await screen.findByRole("button", { name: "جهّزها الحين" });
    await userEvent.click(customize);
    expect(location.current.pathname).toBe("/customization/e1");
  });

  test("فشل الربط: رسالة", async () => {
    mockServer({ claim: () => HttpResponse.json({}, { status: 500 }) });
    renderClaim();

    await userEvent.click(
      await screen.findByRole("button", { name: "اربطه بحسابي" }),
    );

    expect(
      await screen.findByText("تعذر ربط الباكج. حاول مرة أخرى."),
    ).toBeInTheDocument();
  });

  test("انتهت الجلسة أثناء الربط (401): زر تسجيل الدخول", async () => {
    mockServer({ claim: () => HttpResponse.json({}, { status: 401 }) });
    const { location } = renderClaim();

    await userEvent.click(
      await screen.findByRole("button", { name: "اربطه بحسابي" }),
    );

    expect(
      await screen.findByText("انتهت جلسة الدخول. سجّل دخولك لإكمال الربط."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "تسجيل الدخول" }));
    expect(location.current.pathname).toBe("/login");
  });
});

describe("باكج مربوط من قبل", () => {
  test("لحساب ثاني: شارة حمراء وزر باقاتي فقط", async () => {
    mockServer({
      preview: () => HttpResponse.json(makePack({ owner_id: 999 })),
    });
    renderClaim();

    expect(
      await screen.findByRole("heading", { name: "تم ربط الحزمة بمستخدم آخر" }),
    ).toBeInTheDocument();
    expect(screen.getByText("مربوط بحساب آخر")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "اربطه بحسابي" }),
    ).not.toBeInTheDocument();
  });

  test("لي، والجولة ما ظهرت بعد: تحذير وزر تحديث", async () => {
    mockServer({
      preview: () => HttpResponse.json(makePack({ owner_id: testUser.id })),
    });
    renderClaim();

    expect(
      await screen.findByText("حدث التخصيص لم يظهر بعد. حدّث البيانات."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "جهّزها الحين" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "تحديث" })).toBeInTheDocument();
  });

  test("لي، وفيه جولتين: يوجّه لباقاتي", async () => {
    mockServer({
      preview: () => HttpResponse.json(makePack({ owner_id: testUser.id })),
      events: [
        makeEvent({ id: "e1", pack_id: 11 }),
        makeEvent({ id: "e2", pack_id: 11 }),
      ],
    });
    const { location } = renderClaim();

    expect(
      await screen.findByText(
        "يوجد أكثر من حدث لهذا الباكج. اختره من صفحة باقاتي.",
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "باقاتي" }));
    expect(location.current.pathname).toBe("/packages");
  });

  test("لي، وفشل جلب الجولات: رسالة وإعادة المحاولة", async () => {
    server.use(
      http.get(`${API}/packs/preview/:hash`, () =>
        HttpResponse.json(makePack({ owner_id: testUser.id })),
      ),
      http.get(`${API}/events`, () => HttpResponse.json({}, { status: 500 })),
    );
    renderClaim();

    expect(
      await screen.findByText(
        "الباكج مرتبط بحسابك، لكن تعذر تحميل رابط التخصيص.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "إعادة المحاولة" }),
    ).toBeInTheDocument();
  });
});

describe("أخطاء المعاينة", () => {
  test("404: الباكج غير موجود", async () => {
    mockServer({ preview: () => HttpResponse.json({}, { status: 404 }) });
    renderClaim();

    expect(
      await screen.findByText("الباكج غير موجود. تأكد من رابط الاستلام."),
    ).toBeInTheDocument();
  });

  test("500 ثم إعادة المحاولة تنجح", async () => {
    let attempts = 0;
    mockServer({
      preview: () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({}, { status: 500 })
          : HttpResponse.json(makePack());
      },
    });
    renderClaim({ token: null });

    expect(
      await screen.findByText("تعذر الاتصال بالخادم. حاول مرة أخرى."),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "إعادة المحاولة" }),
    );

    expect(
      await screen.findByRole("button", { name: "إنشاء حساب" }),
    ).toBeInTheDocument();
  });
});

test("الخادم ما يتحقق من الحساب: رسالة وإعادة المحاولة", async () => {
  mockServer();
  server.use(
    http.get(`${API}/users/me`, () => HttpResponse.json({}, { status: 500 })),
  );
  renderClaim();

  expect(
    await screen.findByRole("heading", { name: "تعذر التحقق من الحساب" }),
  ).toBeInTheDocument();
});
