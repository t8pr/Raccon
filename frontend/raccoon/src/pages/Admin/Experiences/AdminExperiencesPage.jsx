import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Plus, Search } from "lucide-react";
import AppNavbar from "../../../components/layout/AppNavbar";
import AdminExperienceCard from "../../../components/ui/AdminExperienceCard";
import FilterBar from "../../../components/ui/FilterBar";
import SortButton from "../../../components/ui/SortButton";
import Pagination from "../../../components/ui/Pagination";
import InlineMessage from "../../../components/ui/InlineMessage";
import { getExperiences } from "./ExperiencesData";
import "../../../styles/AdminExperiences.css";

const modeFilters = [
  { value: "all", label: "الكل" },
  { value: "sequential", label: "تسلسلي" },
  { value: "open", label: "صيد مفتوح" },
];

const sorts = [
  { value: "updated", label: "آخر تعديل" },
  { value: "title", label: "الاسم" },
  { value: "price-desc", label: "السعر: الأعلى أولًا" },
];

const statusOptions = [
  { value: "all", label: "الكل" },
  { value: "published", label: "منشورة" },
  { value: "draft", label: "مسودة" },
  { value: "archived", label: "مؤرشفة" },
];

// 9 per page on laptop, 4 on phone (≤ 767px)
function usePerPage() {
  const query = "(max-width: 767px)";
  const [isPhone, setIsPhone] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setIsPhone(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isPhone ? 4 : 9;
}

export default function AdminExperiencesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const perPage = usePerPage();

  const [mode, setMode] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("updated");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [notice] = useState(location.state?.notice ?? "");

  // clear the one-time notice from history so refresh doesn't show it again
  useEffect(() => {
    if (location.state?.notice) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  const all = getExperiences();

  const counts = useMemo(
    () => ({
      total: all.length,
      published: all.filter((e) => e.status === "published").length,
      draft: all.filter((e) => e.status === "draft").length,
      archived: all.filter((e) => e.status === "archived").length,
    }),
    [all],
  );

  const visible = useMemo(() => {
    const q = query.trim();
    const list = all.filter(
      (e) =>
        (mode === "all" || e.mode === mode) &&
        (status === "all" || e.status === status) &&
        (!q || e.title.includes(q)),
    );
    return [...list].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "ar");
      if (sort === "price-desc") return (b.price ?? 0) - (a.price ?? 0);
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }, [all, mode, status, sort, query]);

  const totalPages = Math.max(1, Math.ceil(visible.length / perPage));
  const current = Math.min(page, totalPages); // filters can shrink the page count
  const from = (current - 1) * perPage;
  const pageItems = visible.slice(from, from + perPage);

  // any filter change → back to page 1
  useEffect(() => setPage(1), [mode, status, sort, query, perPage]);

  function goTo(p) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="admin-exp-view" dir="rtl">
      <AppNavbar />

      <main className="admin-exp" aria-labelledby="admin-exp-title">
        <header className="admin-exp__header">
          <div className="admin-exp__heading">
            <p className="admin-exp__crumbs">
              <Link to="/home">الرئيسية</Link> › إدارة التجارب
            </p>
            <h1 id="admin-exp-title">إدارة التجارب</h1>
            <p className="admin-exp__intro">
              التجارب اللي تطلع في المتجر — {counts.total} تجربة · {counts.published} منشورة ·{" "}
              {counts.draft} مسودة · {counts.archived} مؤرشفة
            </p>
          </div>

          <Link to="/admin/experiences/new" className="ui-button ui-button--accent admin-exp__new">
            <Plus size={18} aria-hidden="true" />
            <span>إنشاء تجربة جديدة</span>
          </Link>
        </header>

        {notice && <InlineMessage type="success" message={notice} />}

        <div className="admin-exp__tools">
          <FilterBar filters={modeFilters} value={mode} onChange={setMode} label="نوع التجربة" />

          <div className="admin-exp__controls">
            <label className="admin-exp__search">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                placeholder="دوّر باسم التجربة…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="البحث باسم التجربة"
              />
            </label>

            <label className="sort-button admin-exp__status">
              <select aria-label="حالة التجربة" value={status} onChange={(e) => setStatus(e.target.value)}>
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    الحالة: {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </label>

            <SortButton options={sorts} value={sort} onChange={setSort} />
          </div>
        </div>

        {pageItems.length ? (
          <div className="admin-exp__grid">
            {pageItems.map((exp) => (
              <AdminExperienceCard key={exp.id} experience={exp} />
            ))}
          </div>
        ) : (
          <div className="admin-exp__empty" role="status">
            <p>ما لقينا تجارب بهالفلاتر.</p>
            <button
              type="button"
              className="ui-button ui-button--outline"
              onClick={() => {
                setMode("all");
                setStatus("all");
                setQuery("");
              }}
            >
              امسح الفلاتر
            </button>
          </div>
        )}

        <Pagination
          page={current}
          totalPages={totalPages}
          onChange={goTo}
          summary={
            visible.length
              ? `عرض ${from + 1}–${from + pageItems.length} من ${visible.length} تجربة`
              : ""
          }
        />
      </main>
    </div>
  );
}
