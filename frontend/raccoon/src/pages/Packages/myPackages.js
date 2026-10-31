// dummy data untill we finsh RMZ.gg

import { packages } from "../Store/packages";

// ملكيات تجريبية فقط.
// catalogId يطابق id المنتج الموجود في المتجر.
const demoOwnerships = [
  {
    id: "RC-2026-0601",
    catalogId: "games",
    status: "draft",
    savedPieces: 0,
    isNew: true,
  },
  {
    id: "RC-2026-0415",
    catalogId: "birthday",
    status: "paused",
    savedPieces: 8,
    isNew: false,
  },
  {
    id: "RC-2026-0112",
    catalogId: "riyadh",
    status: "live",
    savedPieces: 15,
    isNew: false,
  },
  {
    id: "RC-2026-0502",
    catalogId: "office",
    status: "draft",
    savedPieces: 3,
    isNew: false,
  },
  {
    id: "RC-2026-0031",
    catalogId: "museum",
    status: "paused",
    savedPieces: 11,
    isNew: false,
  },
];

export const myPackages = demoOwnerships.map((ownership) => {
  const product = packages.find((pkg) => pkg.id === ownership.catalogId);

  if (!product) {
    throw new Error(
      `الباكج "${ownership.catalogId}" غير موجود في بيانات المتجر.`,
    );
  }

  return {
    ...ownership,
    name: product.title,
    mode: product.mode,
    pieces: product.pieces,
    cover: product.cover,
    coverTone: product.coverTone,
  };
});
