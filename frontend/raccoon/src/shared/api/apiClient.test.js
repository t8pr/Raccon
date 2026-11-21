import { describe, expect, test, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/server";
import { API } from "../../test/handlers";
import { setToken } from "../auth/tokenStore";
import { apiRequest, authRequest } from "./apiClient";

// يسجّل وش وصل للخادم الوهمي
function capture(method, path, response = HttpResponse.json({ ok: true })) {
  const seen = {};

  server.use(
    http[method](`${API}${path}`, async ({ request }) => {
      seen.auth = request.headers.get("authorization");
      seen.type = request.headers.get("content-type");
      seen.body = request.method === "GET" ? null : await request.text();
      return response;
    }),
  );

  return seen;
}

describe("apiRequest", () => {
  test("يرسل json ويرجع البيانات", async () => {
    const seen = capture("post", "/things");

    await expect(
      apiRequest("/things", { method: "POST", json: { a: 1 } }),
    ).resolves.toEqual({ ok: true });

    expect(seen.type).toBe("application/json");
    expect(JSON.parse(seen.body)).toEqual({ a: 1 });
    expect(seen.auth).toBeNull();
  });

  test("الرد الفاضي يرجع {}", async () => {
    capture("delete", "/things/1", new HttpResponse(null, { status: 204 }));

    await expect(apiRequest("/things/1", { method: "DELETE" })).resolves.toEqual({});
  });

  test("الخطأ فيه الرسالة العربية و status و detail", async () => {
    capture("get", "/bad", HttpResponse.json({ detail: "Not allowed" }, { status: 403 }));

    const error = await apiRequest("/bad", {}, "ما عندك صلاحية.").catch((e) => e);

    expect(error.message).toBe("ما عندك صلاحية.");
    expect(error.status).toBe(403);
    expect(error.detail).toBe("Not allowed");
  });

  test("بدون رسالة يستخدم الرسالة الافتراضية", async () => {
    capture("get", "/bad", HttpResponse.json({}, { status: 500 }));

    await expect(apiRequest("/bad")).rejects.toThrow("تعذر تنفيذ الطلب.");
  });

  test("detailAsMessage يعرض detail النصي فقط", async () => {
    capture("get", "/text", HttpResponse.json({ detail: "الباكج مستلم" }, { status: 400 }));
    await expect(
      apiRequest("/text", { detailAsMessage: true }, "خطأ"),
    ).rejects.toThrow("الباكج مستلم");

    capture("get", "/list", HttpResponse.json({ detail: [{ msg: "x" }] }, { status: 422 }));
    await expect(
      apiRequest("/list", { detailAsMessage: true }, "خطأ"),
    ).rejects.toThrow("خطأ");
  });

  test("بدون REACT_APP_API_URL يرمي خطأ واضح بدون طلب", async () => {
    vi.stubEnv("REACT_APP_API_URL", "");
    vi.resetModules();
    const { apiRequest: request } = await import("./apiClient");

    await expect(request("/x")).rejects.toThrow("REACT_APP_API_URL");
  });
});

describe("authRequest", () => {
  test("يضيف التوكن المحفوظ تلقائيًا", async () => {
    setToken("tok-1");
    const seen = capture("get", "/me");

    await authRequest("/me");

    expect(seen.auth).toBe("Bearer tok-1");
  });

  test("التوكن الممرر يغلب المحفوظ", async () => {
    setToken("old");
    const seen = capture("get", "/me");

    await authRequest("/me", { token: "fresh" });

    expect(seen.auth).toBe("Bearer fresh");
  });

  test("بدون توكن يرسل الطلب بدون Authorization", async () => {
    const seen = capture("get", "/me");

    await authRequest("/me");

    expect(seen.auth).toBeNull();
  });
});
