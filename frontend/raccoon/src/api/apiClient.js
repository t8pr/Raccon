// Gathring the repeated code and API address and read JSON and handleing error

const API_URL = process.env.REACT_APP_API_URL?.replace(/\/+$/, "");

export async function apiRequest(
  path,
  options = {}, // the defualt empty obj if nothing passing
  errorMessage = "تعذر تنفيذ الطلب.",
) {
  if (!API_URL) {
    throw new Error("عنوان الباك إند غير مضبوط. تحقق من REACT_APP_API_URL."); // create error obj
  }

  const response = await fetch(`${API_URL}${path}`, options); // options: method / headers / body / signals
  const data = await response.json().catch(() => ({})); // read the server response as json . if the response is not json or empty will return {} function

  // if there is any error check come from where
  if (!response.ok) {
    const error = new Error(errorMessage);
    // الصفحات تعتمد على status لتمييز نوع الخطأ.
    error.status = response.status; // 400 , 500 ....
    // التسجيل يستخدم detail لعرض أخطاء الحقول من الباك إند.
    error.detail = data.detail; // invalid userNAme or password come form FAST-API
    throw error; // let the await to move to catch or tanstack Query (تستدعي) onError
  }

  return data; // after success return data to (المتسدعي)
}
