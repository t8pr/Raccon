import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ChevronDown, Plus } from "lucide-react";
import AppNavbar from "../../../components/layout/AppNavbar";
import ExperiencePackCard from "../../../components/ui/ExperiencePackCard";
import FilterBar from "../../../components/ui/FilterBar";
import SortButton from "../../../components/ui/SortButton";
import Pagination from "../../../components/ui/Pagination";
import InlineMessage from "../../../components/ui/InlineMessage";
import { useAuth } from "../../../context/AuthContext";
import { getPacks } from "../../../api/admin/adminApi";
import { fromBackendMode, priceFor } from "./packSizes";
import "../../../styles/AdminExperiences.css";

/*
إدارة التجارب — lists the packs from GET /admin/packs (real backend data).

How the data flows:
1. useQuery calls getPacks(token, { page, size }) → the backend sends ONE page of packs.
2. toCard() turns each backend pack into what the card needs
   (mode "seq" → "sequential", tags_count → pieces, price from the fixed price list).
3. The mode / status filters and the sort work on the page we already have
   (the backend can't filter yet — see the note at the bottom of this file).
*/

const modeFilters = [
  { value: "all", label: "الكل" },
  { value: "sequential", label: "تسلسلي" },
  { value: "open", label: "صيد مفتوح" },
];

const statusOptions = [
  { value: "all", label: "الكل" },
  { value: "available", label: "متاحة" },
  { value: "sold", label: "مُباعة" },
];

const sorts = [
  { value: "default", label: "الافتراضي" },
  { value: "pieces-desc", label: "عدد القطع: الأكثر أولًا" },
  { value: "pieces-asc", label: "عدد القطع: الأقل أولًا" },
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

// backend pack → card props
function toCard(pack) {
  return {
    id: pack.id,
    mode: fromBackendMode(pack.mode),
    pieces: pack.tags_count,
    price: priceFor(pack.tags_count),
    status: pack.owner_id ? "sold" : "available",
  };
}

export default function AdminExperiencesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const perPage = usePerPage();
  const { accessToken } = useAuth();

  const [mode, setMode] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("default");
  const [page, setPage] = useState(1);
  const [notice] = useState(location.state?.notice ?? "");

  // clear the one-time notice from history so refresh doesn't show it again
  useEffect(() => {
    if (location.state?.notice) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  // phone ↔ laptop changes the page size → start again from page 1
  useEffect(() => setPage(1), [perPage]);

  const packsQuery = useQuery({
    queryKey: ["admin-packs", page, perPage],
    queryFn: ({ signal }) => getPacks(accessToken, { page, size: perPage, signal }),
    enabled: Boolean(accessToken),
    placeholderData: keepPreviousData, // keep the old page on screen while the next one loads
  });

  const data = packsQuery.data;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, data?.pages ?? 1);

  const visible = useMemo(() => {
    const cards = (data?.items ?? []).map(toCard);
    const list = cards.filter(
      (c) => (mode === "all" || c.mode === mode) && (status === "all" || c.status === status),
    );
    if (sort === "pieces-desc") return [...list].sort((a, b) => b.pieces - a.pieces);
    if (sort === "pieces-asc") return [...list].sort((a, b) => a.pieces - b.pieces);
    return list;
  }, [data, mode, status, sort]);

  const filtersOn = mode !== "all" || status !== "all";
  const from = (page - 1) * perPage;

  function goTo(p) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearFilters() {
    setMode("all");
    setStatus("all");
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
              كل التجارب اللي انتجت{data ? ` — ${total} تجربة` : ""}
            </p>
          </div>

          <Link to="/admin/experiences/new" className="ui-button ui-button--primary admin-exp__new">
            <Plus size={18} aria-hidden="true" />
            <span>إنشاء تجربة جديدة</span>
          </Link>
        </header>

        {notice && <InlineMessage type="success" message={notice} />}

        <div className="admin-exp__tools">
          <FilterBar filters={modeFilters} value={mode} onChange={setMode} label="نوع التجربة" />

          <div className="admin-exp__controls">
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

        {/* ---------- loading / error / empty / list ---------- */}
        {packsQuery.isPending ? (
          <p className="admin-exp__state" role="status">
            جاري تحميل التجارب...
          </p>
        ) : packsQuery.isError ? (
          <div className="admin-exp__empty" role="alert">
            <p>
              {packsQuery.error.status === 403
                ? "هذي الصفحة للمشرفين بس."
                : "تعذر تحميل التجارب. تأكد إن الباك إند شغّال وحاول مرة ثانية."}
            </p>
            <button type="button" className="ui-button ui-button--outline" onClick={() => packsQuery.refetch()}>
              حاول مرة ثانية
            </button>
          </div>
        ) : total === 0 ? (
          <div className="admin-exp__empty" role="status">
            <p>ما فيه تجارب للحين.</p>
            <Link to="/admin/experiences/new" className="ui-button ui-button--primary">
              أنشئ أول تجربة
            </Link>
          </div>
        ) : visible.length ? (
          <div className="admin-exp__grid" aria-busy={packsQuery.isFetching}>
            {visible.map((card) => (
              <ExperiencePackCard key={card.id} variant="admin" {...card} />
            ))}
          </div>
        ) : (
          <div className="admin-exp__empty" role="status">
            <p>ما فيه تجارب بهالفلاتر في هالصفحة.</p>
            <button type="button" className="ui-button ui-button--outline" onClick={clearFilters}>
              امسح الفلاتر
            </button>
          </div>
        )}

        {total > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={goTo}
            summary={
              filtersOn
                ? `${visible.length} نتيجة في هالصفحة`
                : `عرض ${from + 1}–${Math.min(from + perPage, total)} من ${total} تجربة`
            }
          />
        )}
      </main>
    </div>
  );
}

/*
Note for the backend team:
- GET /admin/packs has no filters, so the mode/status filters only search the current page.
  Adding ?mode=seq|open and ?claimed=true|false to the endpoint would make them search everything.
- Packs have no name, price, status (draft/published) or created_at in the database.
  Price comes from the fixed list in packSizes.js; "متاحة / مُباعة" comes from owner_id.
*/
