import { apiRequest } from "../apiClient";

// Get the current user data
export function getCurrentUser(accessToken, { signal } = {}) {
  return apiRequest(
    "/users/me",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal,
    },
    "تعذر تحميل بيانات الحساب.",
  );
}

// Updata the user info (AvatarIcon / Name / UserName / Phone / ChangePassword)
export function updateProfile(accessToken, changes) {
  return apiRequest(
    "/users/me",
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(changes),
    },
    "تعذر تعديل بيانات الحساب.",
  );
}
