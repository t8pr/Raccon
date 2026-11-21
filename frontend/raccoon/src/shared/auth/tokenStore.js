// مكان واحد لتخزين توكن الدخول.
// AuthContext يكتب ويمسح، و apiClient يقرأ؛ فلا يحتاج أي ملف API أن يستلم التوكن يدويًا.

const TOKEN_KEY = "raccoon_access_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
