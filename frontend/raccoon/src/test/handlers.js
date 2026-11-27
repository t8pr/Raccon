// الردود الافتراضية للخادم الوهمي. كل اختبار يقدر يغيّرها بـ server.use(...)
import { http, HttpResponse } from "msw";
import { testUser } from "./fixtures";

export const API = "http://api.test";

export const handlers = [
  // AuthProvider يجلب الحساب عند وجود توكن
  http.get(`${API}/users/me`, () => HttpResponse.json(testUser)),

  // بث المتصدرين المباشر (SSE): يفتح وما يرسل شي، لين الاختبار يحدد غير كذا بـ sseResponse
  http.get(`${API}/journey/leaderboard/:eventId/stream`, () => sseResponse([])),
];

/*
  رد بث (text/event-stream) يرسل الأحداث هذي ويبقى مفتوح، مثل الخادم الحقيقي.
  events: [{ event: "leaderboard" | "player", data }]
  delay:  ينتظر قبل ما يرسل (الخادم الحقيقي يرسل بعد ما أحد يمسح، مو أول ما تفتح)
*/
export function sseResponse(events, delay = 0) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      setTimeout(() => {
        for (const { event, data } of events) {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        }
      }, delay);
    },
  });
  return new HttpResponse(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
