import { apiRequest } from "../apiClient";

const API_URL = process.env.REACT_APP_API_URL;

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

// use this to rename an event's name
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

export async function GetEventDetails(eventId, accessToken) {
    const response = await fetch(`${API_URL}/events/${eventId}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            }});

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error("حدث خطأ عند استرجاع معلومات الباقه.");
        error.status = response.status;
        throw error;
    }
    return data;
}

export async function SaveTagSetup(eventId, accessToken, tagsConfig) {
  const response = await fetch(`${API_URL}/events/${eventId}/setup`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      tags_config: tagsConfig,
    }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error("حدث خطأ أثناء حفظ إعدادات القطعة.");
        error.status = response.status;
        throw error;
  }

  return data;
}

export async function UpdateEventStatus(eventId, accessToken, status) {
  const response = await fetch(`${API_URL}/events/${eventId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const error = new Error("تعذر تحديث حالة الجولة.");
    error.status = response.status;
    throw error;
  }
}

export async function SaveTagEdits(eventId, accessToken, tagsConfig) {
  const response = await fetch(`${API_URL}/events/${eventId}/edit`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      tags_config: tagsConfig,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error("تعذر حفظ تعديلات الباقة.");
    error.status = response.status;
    throw error;
  }

  return data;
}
