import { apiRequest } from "./apiClient";

const API_URL = process.env.REACT_APP_API_URL;

// call this for leadboard data 
export function getLeaderboard(eventId, accessToken) {
  return apiRequest(
    `/journey/leaderboard/${encodeURIComponent(eventId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    "تعذر تحميل لوحةالمتصدرين.",
  );
}

// call for live events where tag is choose trap
export function setPlayerTrap(tagHash, userHash, accessToken, trapType, trapValue) {
  return apiRequest(
    "/journey/set-trap",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        tag_hash: tagHash,
        injected_user_hash: userHash,
        trap_type: trapType,
        trap_value: trapValue,
      }),
    },
    "تعذر تفعيل الفخ.",
  );
}

export async function scanTagData(tagHash, userHash, accessToken) {
  const response = await fetch(`${API_URL}/journey/scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      tag_hash: tagHash,
      injected_user_hash: userHash,
    }),
  });

  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    const error = new Error("Scan failed");
    error.status = response.status;
    error.detail = data.detail;
    throw error;
  }
  
  return data;
}
