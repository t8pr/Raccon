// كل طلبات الخادم تمرّ من هنا: العنوان، التوكن، قراءة JSON، ومعالجة الخطأ.
// ملفات الـAPI تستخدم دالتين فقط:
//   apiRequest  → طلب عام بلا توكن (تسجيل، دخول، معاينة باكج)
//   authRequest → طلب يحتاج دخول؛ يضيف التوكن تلقائيًا من tokenStore
import { getToken } from "../auth/tokenStore";

const API_URL = process.env.REACT_APP_API_URL?.replace(/\/+$/, "");

/*
  options مثل fetch، مع إضافتين:
    json            كائن يُرسل كـ JSON (يضبط Content-Type و body)
    detailAsMessage إذا رجّع الخادم detail نصيًا، يصير هو رسالة الخطأ
*/
export async function apiRequest(
  path,
  { json, detailAsMessage = false, headers, ...options } = {},
  errorMessage = "تعذر تنفيذ الطلب.",
) {
  if (!API_URL) {
    throw new Error("عنوان الباك إند غير مضبوط. تحقق من REACT_APP_API_URL.");
  }

  const request = { ...options, headers: { ...headers } };

  if (json !== undefined) {
    request.headers["Content-Type"] = "application/json";
    request.body = JSON.stringify(json);
  }

  const response = await fetch(`${API_URL}${path}`, request);
  // إذا الرد فاضي أو ليس JSON نرجّع {}
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const useDetail = detailAsMessage && typeof data.detail === "string";
    const error = new Error(useDetail ? data.detail : errorMessage);
    // الصفحات تعتمد على status لتمييز نوع الخطأ.
    error.status = response.status;
    // التسجيل وشاشات المسح تقرأ detail من الباك إند.
    error.detail = data.detail;
    throw error;
  }

  return data;
}

// نفس apiRequest لكن يضيف توكن المستخدم الحالي.
// token اختياري: يُمرَّر فقط قبل حفظ الجلسة (مثل جلب الحساب مباشرة بعد الدخول).
export function authRequest(path, { token, headers, ...options } = {}, errorMessage) {
  const accessToken = token ?? getToken();

  return apiRequest(
    path,
    {
      ...options,
      headers: accessToken
        ? { ...headers, Authorization: `Bearer ${accessToken}` }
        : headers,
    },
    errorMessage,
  );
}
