// مكان واحد لتخزين توكن الدخول.
// AuthContext يكتب ويمسح، و apiClient يقرأ؛ فلا يحتاج أي ملف API أن يستلم التوكن يدويًا.

const TOKEN_KEY = "raccoon_access_token";

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}
