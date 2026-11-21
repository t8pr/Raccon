// رحلة اللاعب: مسح القطعة، زرع الفخ، المتصدرون.
import { authRequest } from "../../shared/api/apiClient";

// عند الفشل: الخطأ يحمل status و detail (فيه code و message) وتقرأه ScanPage.
export function scanTagData(tagHash, userHash) {
  return authRequest(
    "/journey/scan",
    {
      method: "POST",
      json: { tag_hash: tagHash, injected_user_hash: userHash },
    },
    "تعذر قراءة القطعة.",
  );
}

// للقطع من نوع «اختر الفخ» أثناء الجولة
export function setPlayerTrap(tagHash, userHash, trapType, trapValue) {
  return authRequest(
    "/journey/set-trap",
    {
      method: "POST",
      json: {
        tag_hash: tagHash,
        injected_user_hash: userHash,
        trap_type: trapType,
        trap_value: trapValue,
      },
    },
    "تعذر تفعيل الفخ.",
  );
}

export function getLeaderboard(eventId) {
  return authRequest(
    `/journey/leaderboard/${encodeURIComponent(eventId)}`,
    { method: "GET" },
    "تعذر تحميل لوحة المتصدرين.",
  );
}
