import { expect, test } from "vitest";

import { clearToken, getToken, setToken } from "./tokenStore";

test("التوكن ينحفظ في localStorage (مو sessionStorage)", () => {
  setToken("abc");

  expect(localStorage.getItem("raccoon_access_token")).toBe("abc");
  expect(sessionStorage.getItem("raccoon_access_token")).toBeNull();
  expect(getToken()).toBe("abc");
});

test("clearToken يمسحه", () => {
  setToken("abc");
  clearToken();

  expect(getToken()).toBeNull();
  expect(localStorage.getItem("raccoon_access_token")).toBeNull();
});
