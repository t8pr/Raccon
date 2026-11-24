// الجولات (events): باقات المستخدم، تفاصيل الجولة، حفظ القطع، حالة الجولة.
import { authRequest } from "./apiClient";

const eventPath = (eventId, suffix = "") =>
  `/events/${encodeURIComponent(eventId)}${suffix}`;

export function getMyEvents({ signal } = {}) {
  return authRequest("/events", { method: "GET", signal }, "api.loadEventsFailed");
}

export function renameEvent(eventId, title) {
  return authRequest(
    eventPath(eventId),
    { method: "PATCH", json: { title } },
    "api.renameEventFailed",
  );
}

export function getEventDetails(eventId) {
  return authRequest(
    eventPath(eventId),
    { method: "GET" },
    "api.loadEventFailed",
  );
}

// أول حفظ لإعدادات القطع
export function saveTagSetup(eventId, tagsConfig) {
  return authRequest(
    eventPath(eventId, "/setup"),
    { method: "PUT", json: { tags_config: tagsConfig } },
    "api.saveTagsFailed",
  );
}

// تعديل القطع بعد الحفظ (محدود بعدد مرات)
export function saveTagEdits(eventId, tagsConfig) {
  return authRequest(
    eventPath(eventId, "/edit"),
    { method: "PUT", json: { tags_config: tagsConfig } },
    "api.editTagsFailed",
  );
}

export function updateEventStatus(eventId, status) {
  return authRequest(
    eventPath(eventId),
    { method: "PATCH", json: { status } },
    "api.updateRoundFailed",
  );
}

export function resetEvent(eventId) {
  return authRequest(
    eventPath(eventId, "/reset"),
    { method: "POST", detailAsMessage: true },
    "api.resetRoundFailed",
  );
}

// FormData: المتصفح يضبط Content-Type بنفسه، فلا نستخدم json
export function uploadHintImage(file) {
  const formData = new FormData();
  formData.append("file", file);

  return authRequest(
    "/events/upload-image",
    { method: "POST", body: formData, detailAsMessage: true },
    "api.uploadImageFailed",
  );
}
