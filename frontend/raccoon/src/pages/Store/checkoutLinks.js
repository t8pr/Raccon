// ضع رابط دفع رمز بين علامتي الاقتباس لكل بكج، ثم أعد نشر الموقع.
export const CHECKOUT_LINKS = {
  "sequential-6": "",
  "sequential-10": "",
  "sequential-15": "",
  "sequential-21": "",
  "open-6": "",
  "open-10": "",
  "open-15": "",
  "open-21": "",
};

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

// Static catalog: independent of admin-created packs and API responses.
export const STORE_PACKAGES = ["sequential", "open"].flatMap((mode) =>
  [
    { pieces: 6, price: 79 },
    { pieces: 10, price: 130 },
    { pieces: 15, price: 195 },
    { pieces: 21, price: 273 },
  ].map((size) => ({
    ...size,
    mode,
    id: `${mode}-${size.pieces}`,
    purchaseUrl: CHECKOUT_LINKS[`${mode}-${size.pieces}`],
  })),
);
