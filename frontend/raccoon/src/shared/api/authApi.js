// Register / Login / Logout / ChangePassword / DeleteAccount / ForgotPassword / ResetPassword
import { apiRequest, authRequest } from "./apiClient";

// Create-Account (Register)
export function registerUser(userData) {
  return apiRequest(
    "/auth/register",
    { method: "POST", json: userData },
    "تعذر إنشاء الحساب.",
  );
}

// Login
export function loginUser({ identifier, password }) {
  const formData = new URLSearchParams();

  // الباك إند ينتظر username حتى لو القيمة بريدًا إلكترونيًا.
  formData.append("username", identifier);
  formData.append("password", password);
  formData.append("grant_type", "password");

  return apiRequest(
    "/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    },
    "تعذر تسجيل الدخول.",
  );
}

// Logout
export async function logoutUser() {
  await authRequest("/auth/logout", { method: "POST" }, "تعذر تسجيل الخروج.");
}

// ChangePassword
export function changePassword(passwords) {
  return authRequest(
    "/auth/change-password",
    { method: "POST", json: passwords },
    "تعذر تغيير كلمة المرور.",
  );
}

// DeleteAccount
export function deleteAccount() {
  return authRequest(
    "/auth/delete-account",
    { method: "DELETE" },
    "تعذر حذف الحساب.",
  );
}

// ForgotPassword
export function requestPasswordReset(email) {
  return apiRequest(
    "/auth/forgot-password",
    { method: "POST", json: { email } },
    "تعذر إرسال رابط إعادة تعيين كلمة المرور.",
  );
}

// ResetPassword
export function resetPassword({ token, newPassword }) {
  return apiRequest(
    "/auth/reset-password",
    { method: "POST", json: { token, new_password: newPassword } },
    "تعذر تغيير كلمة المرور.",
  );
}
