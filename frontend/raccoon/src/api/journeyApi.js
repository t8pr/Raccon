const API_URL = process.env.REACT_APP_API_URL;

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