// ضع رابط دفع رمز بين علامتي الاقتباس لكل بكج، ثم أعد نشر الموقع.
export const CHECKOUT_LINKS = {
  "sequential-6": "https://raccon.rmz.gg/product/6seq",
  "sequential-10": "https://raccon.rmz.gg/product/10seq",
  "sequential-15": "https://raccon.rmz.gg/product/15seq",
  "sequential-21": "https://raccon.rmz.gg/product/21seq",
  "open-6": "https://raccon.rmz.gg/product/6open",
  "open-10": "https://raccon.rmz.gg/product/10open",
  "open-15": "https://raccon.rmz.gg/product/15open",
  "open-21": "https://raccon.rmz.gg/product/21open",
};

// يقبل https فقط وبدون اسم مستخدم أو كلمة مرور في الرابط؛ غير ذلك يرجّع null.
export function checkoutUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
