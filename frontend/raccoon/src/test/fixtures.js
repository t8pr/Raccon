// بيانات جاهزة بنفس شكل ردود الخادم. كل دالة تقبل تعديلات: makeTag(1, { is_configured: true })

export const testUser = {
  id: 7,
  name: "عبدالرحمن",
  username: "abdu",
  email: "abdu@example.com",
  phone_number: "512345678",
  role: "user",
  avatar_id: 3,
  user_hash: "u8hash01",
};

export const adminUser = {
  ...testUser,
  id: 1,
  username: "admin",
  role: "admin",
};

export function makeTag(sequence, overrides = {}) {
  return {
    tag_id: `t${sequence}`,
    sequence_num: sequence,
    tag_type: "clue",
    is_configured: false,
    content: null,
    ...overrides,
  };
}

export function makeEvent(overrides = {}) {
  return {
    id: "e1",
    pack_id: 11,
    title: "جولة يوم التأسيس",
    mode: "open",
    status: "draft",
    edits_remaining: 3,
    max_edits: 3,
    tags_count: 3,
    tags: [makeTag(1), makeTag(2), makeTag(3)],
    ...overrides,
  };
}

export function makePack(overrides = {}) {
  return {
    id: 11,
    mode: "open",
    tags_count: 6,
    owner_id: null,
    ...overrides,
  };
}
