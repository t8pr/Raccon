// Fixed pack sizes and prices (13 ر.س per piece, smallest pack = 6 pieces).
// The admin picks one of these; the price is never typed by hand.

export const PRICE_PER_PIECE = 13;

export const PACK_SIZES = [
  { pieces: 6, price: 79 },
  { pieces: 10, price: 130 },
  { pieces: 15, price: 195 },
  { pieces: 21, price: 273 },
];

export const MODE_LABEL = {
  sequential: "تسلسلي",
  open: "صيد مفتوح",
};

export function priceFor(pieces) {
  return PACK_SIZES.find((size) => size.pieces === pieces)?.price ?? null;
}

// Arabic: 3–10 → "قطع", 11+ → "قطعة"
export function piecesLabel(pieces) {
  return pieces >= 3 && pieces <= 10 ? `${pieces} قطع` : `${pieces} قطعة`;
}

// Old dummy data had other sizes (8, 12…): snap them to the closest real size.
export function closestSize(pieces) {
  return PACK_SIZES.reduce((best, size) =>
    Math.abs(size.pieces - pieces) < Math.abs(best.pieces - pieces) ? size : best,
  ).pieces;
}

// The backend says "seq" / "open"; the frontend says "sequential" / "open".
export const toBackendMode = (mode) => (mode === "sequential" ? "seq" : "open");
export const fromBackendMode = (mode) => (mode === "seq" ? "sequential" : "open");
