import { z } from "zod";
import { claimHashSchema } from "./validation";

const purchaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  claimHash: claimHashSchema,
  mode: z.enum(["sequential", "open"]),
  pieces: z.number().int().positive(),
  coverTone: z.enum(["mint", "soft"]),
  purchasedAt: z.string().min(1),
});

const purchasesSchema = z.array(purchaseSchema);

export function localPurchasesKey(userId) {
  return ["local-purchases", userId];
}

export function purchasesStorageKey(userId) {
  if (!userId) {
    throw new Error("سجّل دخولك أولًا.");
  }

  return `raccoon:local-purchases:v1:${userId}`;
}

export function readLocalPurchases(userId) {
  const key = purchasesStorageKey(userId);

  try {
    const raw = localStorage.getItem(key);

    if (!raw) return [];

    return purchasesSchema.parse(JSON.parse(raw));
  } catch {
    throw new Error("تعذر قراءة مشتريات الحساب من هذا المتصفح.");
  }
}

export function addLocalPurchase(userId, product) {
  const purchase = purchaseSchema.parse({
    id: product.id,
    name: product.title,
    claimHash: product.claimHash,
    mode: product.mode,
    pieces: product.pieces,
    coverTone: product.coverTone || "mint",
    purchasedAt: new Date().toISOString(),
  });

  const current = readLocalPurchases(userId);

  // كل منتج له حزمة اختبار واحدة؛ لا نكررها.
  const alreadyAdded = current.some(
    (item) => item.id === purchase.id || item.claimHash === purchase.claimHash,
  );

  if (alreadyAdded) {
    return current;
  }

  const updated = [...current, purchase];

  try {
    localStorage.setItem(purchasesStorageKey(userId), JSON.stringify(updated));
  } catch {
    throw new Error("تعذر حفظ الحزمة في المتصفح. تأكد من السماح بالتخزين.");
  }

  return updated;
}

export function renameLocalPurchase(userId, purchaseId, name) {
  const result = z.string().trim().min(1).max(20).safeParse(name);

  if (!result.success) {
    throw new Error("اكتب اسمًا من حرف إلى 20 حرفًا.");
  }

  const current = readLocalPurchases(userId);

  const updated = current.map((item) =>
    item.id === purchaseId ? { ...item, name: result.data } : item,
  );

  try {
    localStorage.setItem(purchasesStorageKey(userId), JSON.stringify(updated));
  } catch {
    throw new Error("تعذر حفظ الاسم في المتصفح.");
  }

  return updated;
}
