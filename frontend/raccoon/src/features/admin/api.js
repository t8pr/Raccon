// Admin endpoints (backend: backend/api/admin/router.py).
// Every call needs the admin's token (authRequest adds it) — the backend answers 403 for normal users.
import { authRequest } from "../../shared/api/apiClient";

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
export function getPacks({ page = 1, size = 9, signal } = {}) {
  const query = new URLSearchParams({ page, size });
  return authRequest(
    `/admin/packs?${query}`,
    { method: "GET", signal },
    "api.loadExperiencesFailed",
  );
}

/*
POST /admin/generate-packs
Body: { mode: "seq" | "open", tags_count: 6, quantity: 3 }
Creates `quantity` packs, each with `tags_count` NFC tags.
Returns: [{ pack_id, master_auth_hash, tags: [...] }, ...]
*/
export function generatePacks({ mode, tagsCount, quantity }) {
  return authRequest(
    "/admin/generate-packs",
    { method: "POST", json: { mode, tags_count: tagsCount, quantity } },
    "api.createExperienceFailed",
  );
}

/*
GET /admin/users
*/
export function getUsers({ page = 1, size = 10 }) {
  const query = new URLSearchParams({ page, size });

  return authRequest(
    `/admin/users?${query}`,
    { method: "GET"}
  )
}

/*
DELETE /admin/delete-user/{user_id}
*/
export function deleteUser({ user_id }) {
  return authRequest(
    `/admin/delete-user/${user_id}`,
    { method: "DELETE"}
  )
}

/*
DELETE /admin/delete-pack/{pack_id}
*/
export function deletePack({ pack_id }) {
  return authRequest(
    `/admin/delete-pack/${pack_id}`,
    { method: "DELETE"}
  )
}
