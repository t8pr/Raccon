// Here we have Endpoint for Register/Login/Logout/ChangePassword/DeleteAccount
import { apiRequest } from "../apiClient";

// Create-Account (Register)
export function registerUser(userData) {
  return apiRequest(
    "/auth/register",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // tell the server the data is json
      },
      body: JSON.stringify(userData), // convert userData obj to json
    },
    "تعذر إنشاء الحساب.",
  );
}

//Login
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
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(), // Body: it is the data we send it to do action like register data
    },
    "تعذر تسجيل الدخول.",
  );
}

// Logout
export async function logoutUser(accessToken) {
  await apiRequest(
    "/auth/logout",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    "تعذر تسجيل الخروج.",
  );
}

// ChangePassword
export function changePassword(accessToken, passwords) {
  return apiRequest(
    "/auth/change-password",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(passwords),
    },
    "تعذر تغيير كلمة المرور.",
  );
}

//DeleteAccount
export function deleteAccount(accessToken) {
  return apiRequest(
    "/auth/delete-account",
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    "تعذر حذف الحساب.",
  );
}
