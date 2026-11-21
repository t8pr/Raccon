// مفاتيح react-query في مكان واحد، حتى لا تُكتب نصوصًا في كل صفحة.
// كل دالة بلا معاملات ترجّع بادئة المفتاح (تُستخدم في invalidate / remove لكل ما يبدأ بها).

export const queryKeys = {
  // حساب المستخدم الحالي
  profile: (token) => (token === undefined ? ["profile"] : ["profile", token]),

  // باقات المستخدم (الجولات)
  myEvents: (userId) => ["my-events", userId],

  // تفاصيل جولة واحدة في صفحة التخصيص
  event: (eventId, token) => ["event", eventId, token],

  // معاينة باكج قبل ربطه بالحساب
  packPreview: (masterAuthHash, userId) => [
    "pack-preview",
    masterAuthHash,
    userId ?? "guest",
  ],

  // معلومات باكج مربوط (تكتبها صفحة الربط؛ لا يقرأها أحد حاليًا)
  packInfo: (userId, packId) => ["pack-info", userId, packId],

  // جولات المستخدم داخل صفحة الربط
  claimEvents: (userId, packId) => ["claim-events", userId, packId],

  // تجارب الأدمن (صفحة واحدة، أو كل الصفحات بلا معاملات)
  adminPacks: (page, perPage) =>
    page === undefined ? ["admin-packs"] : ["admin-packs", page, perPage],
};
