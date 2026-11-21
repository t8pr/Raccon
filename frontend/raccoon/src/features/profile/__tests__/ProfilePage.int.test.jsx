import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { describe, expect, test } from "vitest";

import { server } from "../../../test/server";
import { API } from "../../../test/handlers";
import { testUser } from "../../../test/fixtures";
import { renderWithProviders } from "../../../test/renderWithProviders";
import ProfilePage from "../ProfilePage";
import ProtectedRoute from "../../../shared/auth/ProtectedRoute";
import { getToken } from "../../../shared/auth/tokenStore";

function renderProfile() {
  return renderWithProviders(
    <Routes>
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/" element={<p>البداية</p>} />
    </Routes>,
    { route: "/profile" },
  );
}

const ready = () => screen.findByRole("heading", { name: "حسابي" });

test("يعرض الشخصية والمعلومات، والإيميل ما يتعدّل", async () => {
  renderProfile();
  await ready();

  const info = screen.getByRole("region", { name: "معلوماتي" });
  expect(within(info).getByText("abdu@example.com")).toBeInTheDocument();
  expect(within(info).getByText("+966 512345678")).toBeInTheDocument();
  expect(within(info).getByText("ما يتعدّل")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "عبدالرحمن" }),
  ).toBeInTheDocument();
});

describe("تعديل حقل", () => {
  test("الاسم: يفتح النافذة بالقيمة، يحفظ، ويحدّث الصفحة", async () => {
    let body;
    server.use(
      http.patch(`${API}/users/me`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...testUser, ...body });
      }),
    );
    renderProfile();
    await ready();

    await userEvent.click(screen.getByRole("button", { name: "تعديل الاسم" }));
    const dialog = await screen.findByRole("dialog", { name: "تعديل الاسم" });
    const input = within(dialog).getByLabelText("الاسم");
    expect(input).toHaveValue("عبدالرحمن");

    await userEvent.clear(input);
    await userEvent.type(input, "نورة");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "حفظ التغييرات" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "تم حفظ التغييرات.",
    );
    expect(body).toEqual({ name: "نورة" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "نورة" })).toBeInTheDocument();
  });

  test("اسم مستخدم مأخوذ: الرسالة الصحيحة داخل النافذة", async () => {
    server.use(
      http.patch(`${API}/users/me`, () =>
        HttpResponse.json(
          { detail: "Username is already taken" },
          { status: 400 },
        ),
      ),
    );
    renderProfile();
    await ready();

    await userEvent.click(
      screen.getByRole("button", { name: "تعديل اسم المستخدم" }),
    );
    const dialog = await screen.findByRole("dialog");
    await userEvent.clear(within(dialog).getByLabelText("اسم المستخدم"));
    await userEvent.type(
      within(dialog).getByLabelText("اسم المستخدم"),
      "taken",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "حفظ التغييرات" }),
    );

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "اسم المستخدم مستخدم من قبل. اختر اسمًا آخر.",
    );
  });

  test("«إلغاء» يقفل النافذة بدون طلب", async () => {
    renderProfile();
    await ready();

    await userEvent.click(
      screen.getByRole("button", { name: "تعديل رقم الجوال" }),
    );
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "إلغاء",
      }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

test("تغيير الشخصية", async () => {
  let body;
  server.use(
    http.patch(`${API}/users/me`, async ({ request }) => {
      body = await request.json();
      return HttpResponse.json({ ...testUser, ...body });
    }),
  );
  renderProfile();
  await ready();

  await userEvent.click(screen.getByRole("button", { name: "غيّر الشخصية" }));
  const dialog = await screen.findByRole("dialog", { name: "غيّر شخصيتك" });
  expect(within(dialog).getByRole("radio", { name: "منتو" })).toBeChecked();

  await userEvent.click(within(dialog).getByRole("radio", { name: "صخر" }));
  await userEvent.click(
    within(dialog).getByRole("button", { name: "حفظ التغييرات" }),
  );

  expect(await screen.findByText("تم حفظ التغييرات.")).toBeInTheDocument();
  expect(body).toEqual({ avatar_id: 4 });
});

test("تغيير كلمة المرور", async () => {
  let body;
  server.use(
    http.post(`${API}/auth/change-password`, async ({ request }) => {
      body = await request.json();
      return HttpResponse.json({});
    }),
  );
  renderProfile();
  await ready();

  await userEvent.click(
    screen.getByRole("button", { name: "تغيير كلمة المرور" }),
  );
  const dialog = await screen.findByRole("dialog");
  await userEvent.type(
    within(dialog).getByLabelText("كلمة المرور الحالية"),
    "oldpass12",
  );
  await userEvent.type(
    within(dialog).getByLabelText("كلمة المرور الجديدة"),
    "newpass123",
  );
  await userEvent.type(
    within(dialog).getByLabelText("تأكيد كلمة المرور"),
    "newpass123",
  );
  await userEvent.click(
    within(dialog).getByRole("button", { name: "حفظ التغييرات" }),
  );

  expect(await screen.findByText("تم تغيير كلمة المرور.")).toBeInTheDocument();
  expect(body).toEqual({
    old_password: "oldpass12",
    new_password: "newpass123",
  });
});

describe("حذف الحساب", () => {
  test("زر الحذف معطّل حتى يكتب اسم المستخدم", async () => {
    renderProfile();
    await ready();

    await userEvent.click(screen.getByRole("button", { name: "احذف حسابي" }));
    const dialog = await screen.findByRole("dialog", { name: "حذف الحساب" });
    const confirm = within(dialog).getByRole("button", {
      name: "احذف حسابي نهائيًا",
    });

    expect(confirm).toBeDisabled();
    await userEvent.type(
      within(dialog).getByLabelText("اكتب اسم المستخدم abdu للتأكيد"),
      "abdu",
    );
    expect(confirm).toBeEnabled();
  });

  // كان خطأ: markAccountDeleted يطلّع المستخدم فورًا، فالصفحة تختفي قبل نافذة «تم حذف حسابك».
  // الحين تبقى الصفحة والنافذة، وإغلاق النافذة هو اللي يطلّعه.
  test("بعد الحذف تظهر نافذة «تم حذف حسابك»، وإغلاقها يطلّعه", async () => {
    server.use(
      http.delete(`${API}/auth/delete-account`, () => HttpResponse.json({})),
    );
    const { location } = renderWithProviders(
      <Routes>
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<p>البداية</p>} />
        <Route path="/login" element={<p>صفحة الدخول</p>} />
      </Routes>,
      { route: "/profile" },
    );
    await ready();

    await userEvent.click(screen.getByRole("button", { name: "احذف حسابي" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(
      within(dialog).getByLabelText("اكتب اسم المستخدم abdu للتأكيد"),
      "abdu",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "احذف حسابي نهائيًا" }),
    );

    expect(
      await screen.findByRole("heading", { name: "تم حذف حسابك" }),
    ).toBeInTheDocument();
    // التوكن انمسح من التخزين من الحين، وما رحنا لصفحة الدخول
    expect(getToken()).toBeNull();
    expect(location.current.pathname).toBe("/profile");

    await userEvent.click(screen.getAllByRole("button", { name: "إغلاق" })[0]);

    expect(await screen.findByText("البداية")).toBeInTheDocument();
    expect(location.current.pathname).toBe("/");
  });
});
