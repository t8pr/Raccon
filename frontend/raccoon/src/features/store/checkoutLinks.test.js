import { describe, expect, test } from "vitest";
import { CHECKOUT_LINKS, checkoutUrl } from "./checkoutLinks";

test("كل روابط الدفع صالحة", () => {
  for (const [id, link] of Object.entries(CHECKOUT_LINKS)) {
    expect(checkoutUrl(link), id).toBe(link);
  }
});

describe("checkoutUrl يرفض", () => {
  test.each([
    ["http بدل https", "http://raccon.rmz.gg/product/6seq"],
    ["اسم مستخدم وكلمة مرور", "https://a:b@raccon.rmz.gg/product/6seq"],
    ["نص مو رابط", "not a url"],
    ["فاضي", ""],
    ["غير موجود", undefined],
    ["javascript", "javascript:alert(1)"],
  ])("%s", (_, value) => {
    expect(checkoutUrl(value)).toBeNull();
  });
});
