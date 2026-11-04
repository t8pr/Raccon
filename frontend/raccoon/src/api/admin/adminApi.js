// Admin endpoints (backend: backend/api/admin/router.py).
// Every call needs the admin's token — the backend answers 403 for normal users.
import { apiRequest } from "../apiClient";

/*
GET /admin/packs?page=1&size=9
Returns one page of packs (fastapi-pagination "Page"):
{
  items: [{ id, mode: "seq" | "open", tags_count, owner_id }],
  total: 42,   // all packs
  page: 1,
  size: 9,
  pages: 5     // how many pages
}
owner_id = null → nobody claimed it yet (still available).
*/
export function getPacks(accessToken, { page = 1, size = 9, signal } = {}) {
  const query = new URLSearchParams({ page, size });
  return apiRequest(
    `/admin/packs?${query}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    },
    "تعذر تحميل التجارب.",
  );
}

/*
POST /admin/generate-packs
Body: { mode: "seq" | "open", tags_count: 6, quantity: 3 }
Creates `quantity` packs, each with `tags_count` NFC tags.
Returns: [{ pack_id, master_auth_hash, tags: [...] }, ...]
*/
export function generatePacks(accessToken, { mode, tagsCount, quantity }) {
  return apiRequest(
    "/admin/generate-packs",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mode, tags_count: tagsCount, quantity }),
    },
    "تعذر إنشاء التجربة.",
  );
}
