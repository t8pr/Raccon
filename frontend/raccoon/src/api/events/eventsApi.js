import { apiRequest } from "../apiClient";

export function getMyEvents(accessToken, { signal } = {}) {
  return apiRequest(
    "/events",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal,
    },
    "تعذر تحميل باقاتك.",
  );
}

export function RenameEvent(eventId, accessToken, title) {
  return apiRequest(
    `/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ title }),
    },
    "تعذر حفظ اسم الباقة.",
  );
}
