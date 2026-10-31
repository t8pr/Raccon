import { apiRequest } from "../apiClient";
import { claimHashSchema, claimRequestSchema } from "../../utils/validation";

export function previewPack(masterAuthHash, { signal } = {}) {
  const hash = claimHashSchema.parse(masterAuthHash);

  return apiRequest(
    `/packs/preview/${encodeURIComponent(hash)}`,
    {
      method: "GET",
      signal,
    },
    "تعذر تحميل معلومات الباكج.",
  );
}

export function claimPack(accessToken, masterAuthHash) {
  const body = claimRequestSchema.parse({
    master_auth_hash: masterAuthHash,
  });

  return apiRequest(
    "/packs/claim",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    "تعذر ربط الباكج بحسابك.",
  );
}
