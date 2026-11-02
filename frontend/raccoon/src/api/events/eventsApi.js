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
