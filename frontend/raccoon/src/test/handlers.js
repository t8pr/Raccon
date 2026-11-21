// الردود الافتراضية للخادم الوهمي. كل اختبار يقدر يغيّرها بـ server.use(...)
import { http, HttpResponse } from "msw";
import { testUser } from "./fixtures";

export const API = "http://api.test";

export const handlers = [
  // AuthProvider يجلب الحساب عند وجود توكن
  http.get(`${API}/users/me`, () => HttpResponse.json(testUser)),
];
