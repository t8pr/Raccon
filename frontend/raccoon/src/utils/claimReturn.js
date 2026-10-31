import { claimReturnSchema } from "./validation";

const KEY = "raccoon_claim_return";
const MAX_AGE = 60 * 60 * 1000;

export function rememberClaimReturn(path) {
  const value = claimReturnSchema.parse({
    path,
    createdAt: Date.now(),
  });

  sessionStorage.setItem(KEY, JSON.stringify(value));
}

export function takeClaimReturn() {
  const saved = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);

  if (!saved) return null;

  try {
    const result = claimReturnSchema.safeParse(JSON.parse(saved));

    if (!result.success) return null;

    const age = Date.now() - result.data.createdAt;

    if (age < 0 || age > MAX_AGE) return null;

    return result.data.path;
  } catch {
    return null;
  }
}
