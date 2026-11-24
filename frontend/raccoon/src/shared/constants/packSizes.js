// Fixed pack sizes and prices (13 ر.س per piece, smallest pack = 6 pieces).
// The admin picks one of these; the price is never typed by hand.

import i18n from "../../i18n";

export const PRICE_PER_PIECE = 13;

export const PACK_SIZES = [
  { pieces: 6, price: 79 },
  { pieces: 10, price: 130 },
  { pieces: 15, price: 195 },
  { pieces: 21, price: 273 },
];

export function priceFor(pieces) {
  return PACK_SIZES.find((size) => size.pieces === pieces)?.price ?? null;
}

// صيغ الجمع من ملف الترجمة (common.pieces_*): العربي 3–10 → "قطع"، غيرها → "قطعة"
export function piecesLabel(pieces) {
  return i18n.t("common.pieces", { count: pieces });
}

// Old dummy data had other sizes (8, 12…): snap them to the closest real size.
export function closestSize(pieces) {
  return PACK_SIZES.reduce((best, size) =>
    Math.abs(size.pieces - pieces) < Math.abs(best.pieces - pieces) ? size : best,
  ).pieces;
}
