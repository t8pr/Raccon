import { authRequest } from "./apiClient";

// Get the current user data.
// token اختياري: صفحتا الدخول والتسجيل تمرّرانه لأن الجلسة لم تُحفظ بعد.
export function getCurrentUser({ token, signal } = {}) {
  return authRequest(
    "/users/me",
    { method: "GET", token, signal },
    "api.loadUserFailed",
  );
}

// Update the user info (AvatarIcon / Name / UserName / Phone)
export function updateProfile(changes) {
  return authRequest(
    "/users/me",
    { method: "PATCH", json: changes },
    "api.updateUserFailed",
  );
}
