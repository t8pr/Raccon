import { apiRequest, authRequest } from "../../shared/api/apiClient";
import { claimHashSchema, claimRequestSchema } from "../../shared/utils/validation";

export function previewPack(masterAuthHash, { signal } = {}) {
  const hash = claimHashSchema.parse(masterAuthHash);

  return apiRequest(
    `/packs/preview/${encodeURIComponent(hash)}`,
    {
      method: "GET",
      signal,
    },
    "api.loadPackFailed",
  );
}

export function claimPack(masterAuthHash) {
  const body = claimRequestSchema.parse({
    master_auth_hash: masterAuthHash,
  });

  return authRequest(
    "/packs/claim",
    { method: "POST", json: body },
    "api.claimPackFailed",
  );
}
