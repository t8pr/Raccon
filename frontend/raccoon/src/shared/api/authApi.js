// Register / Login / Logout / ChangePassword / DeleteAccount / ForgotPassword / ResetPassword
import { apiRequest, authRequest } from "./apiClient";

// Create-Account (Register)
export function registerUser(userData) {
  return apiRequest(
    "/auth/register",
    { method: "POST", json: userData },
    "api.registerFailed",
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
    "api.loginFailed",
  );
}

// Logout
export async function logoutUser() {
  await authRequest("/auth/logout", { method: "POST" }, "api.logoutFailed");
}

// ChangePassword
export function changePassword(passwords) {
  return authRequest(
    "/auth/change-password",
    { method: "POST", json: passwords },
    "api.changePasswordFailed",
  );
}

// DeleteAccount
export function deleteAccount() {
  return authRequest(
    "/auth/delete-account",
    { method: "DELETE" },
    "api.deleteAccountFailed",
  );
}

// ForgotPassword
export function requestPasswordReset(email) {
  return apiRequest(
    "/auth/forgot-password",
    { method: "POST", json: { email } },
    "api.forgotPasswordFailed",
  );
}

// ResetPassword
export function resetPassword({ token, newPassword }) {
  return apiRequest(
    "/auth/reset-password",
    { method: "POST", json: { token, new_password: newPassword } },
    "api.changePasswordFailed",
  );
}

// Google sign-in: send Google's ID token (credential) to the backend.
// Same call for login and register — the backend creates the account on first sign-in.
export function googleLogin(credential) {
  return apiRequest(
    "/auth/google",
    { method: "POST", json: { credential } },
    "api.googleLoginFailed",
  );
}
