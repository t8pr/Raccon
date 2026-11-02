// Dummy data until the backend has an experiences (store catalog) table.
import { packages } from "../../Store/packages";

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

const fromStore = packages.map((pkg, index) => ({
  id: pkg.id,
  title: pkg.title,
  description: pkg.description,
  category: "عائلي",
  place: "",
  players: pkg.meta.split(" · ")[2] ?? "",
  duration: pkg.meta.split(" · ")[1] ?? "",
  pieces: pkg.pieces,
  mode: pkg.mode, // "sequential" | "open"
  price: pkg.price,
  coverTone: pkg.coverTone,
  status: "published",
  updatedAt: daysAgo(index * 3 + 1),
}));

const extra = [
  ["school-day", "يوم المدرسة المفتوح", "الطلاب يكتشفون المدرسة محطة محطة.", 9, "sequential", 169, "draft", "تعليمي", "10–40 لاعب", "45 دقيقة"],
  ["book-fair", "معرض الكتاب", "صيد بين الأجنحة، كل قطعة فيها سؤال.", 20, "open", 279, "published", "فعاليات", "10–60 لاعب", "60 دقيقة"],
  ["family-night", "ليلة العائلة", "ألغاز خفيفة للكبار والصغار.", 6, "open", 129, "published", "عائلي", "3–12 لاعب", "30 دقيقة"],
  ["desert-trip", "رحلة البر", "للكشتات والمخيمات، القطع تتحمل الشمس.", 12, "open", 189, "archived", "عائلي", "4–20 لاعب", "60–90 دقيقة"],
  ["team-quest", "مهمة الفريق", "تحدي تعاون للشركات، كل قطعة تحتاج الفريق كامل.", 10, "sequential", 199, "published", "شركات", "6–25 لاعب", "45–60 دقيقة"],
  ["mall-hunt", "صيد المول", "قطع موزعة على المحلات، اللي يخلص أول يفوز.", 14, "open", 219, "draft", "فعاليات", "10–50 لاعب", "60 دقيقة"],
  ["kids-garden", "حديقة الأطفال", "مسار قصير وملوّن للصغار.", 5, "sequential", 99, "published", "أطفال", "2–10 لاعب", "20 دقيقة"],
  ["heritage", "جولة التراث", "قطع في البيوت الطينية، كل وحدة تحكي قصة.", 12, "sequential", 239, "published", "تعليمي", "6–30 لاعب", "90 دقيقة"],
  ["eid-hunt", "صيد العيد", "عيدية لكل قطعة تلقاها.", 8, "open", 149, "archived", "عائلي", "3–15 لاعب", "30–45 دقيقة"],
  ["science", "مختبر الألغاز", "تجارب علمية صغيرة في كل محطة.", 10, "sequential", 189, "draft", "تعليمي", "6–24 لاعب", "60 دقيقة"],
  ["camp-night", "ليلة المخيم", "ألغاز حول النار، القطع تضيء بالجوال.", 9, "open", 169, "published", "عائلي", "4–20 لاعب", "45 دقيقة"],
  ["museum-kids", "المتحف الصغير", "نسخة مبسطة من ليلة المتحف للأطفال.", 7, "sequential", 139, "published", "أطفال", "3–12 لاعب", "30 دقيقة"],
  ["expo", "جناح المعرض", "يجذب الزوار لجناحك بقطع ذكية.", 15, "open", 259, "published", "فعاليات", "20–100 لاعب", "طوال اليوم"],
  ["onboarding", "يومك الأول", "تعريف الموظفين الجدد بالمكتب.", 8, "sequential", 159, "draft", "شركات", "3–15 لاعب", "40 دقيقة"],
];

const fromExtra = extra.map(
  ([id, title, description, pieces, mode, price, status, category, players, duration], index) => ({
    id,
    title,
    description,
    category,
    place: "",
    players,
    duration,
    pieces,
    mode,
    price,
    coverTone: index % 2 ? "mint" : "soft",
    status,
    updatedAt: daysAgo(index * 2 + 2),
  }),
);

// In-memory list: new experiences stay until the page is refreshed.
let experiences = [...fromStore, ...fromExtra];

export function getExperiences() {
  return experiences;
}

export function addExperience(experience) {
  const item = {
    id: `exp-${Date.now()}`,
    price: null,
    coverTone: experience.mode === "sequential" ? "soft" : "mint",
    updatedAt: new Date().toISOString(),
    ...experience,
  };
  experiences = [item, ...experiences];
  return item;
}

export function getExperience(id) {
  return experiences.find((item) => item.id === id) ?? null;
}

export function updateExperience(id, changes) {
  experiences = experiences.map((item) =>
    item.id === id ? { ...item, ...changes, updatedAt: new Date().toISOString() } : item,
  );
  return getExperience(id);
}
