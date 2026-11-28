import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import AppNavbar from "../../shared/layout/AppNavbar/AppNavbar";
import ExperiencePackCard from "../../shared/ui/ExperiencePackCard/ExperiencePackCard";
import FilterBar from "../../shared/ui/FilterBar/FilterBar";
import Pagination from "./components/Pagination/Pagination";
import ConfirmDialog from "../../shared/ui/ConfirmDialog/ConfirmDialog";
import InlineMessage from "../../shared/ui/InlineMessage/InlineMessage";
import { useAuth } from "../../shared/auth/AuthContext";
import { deletePack, getPacks } from "./api";
import { priceFor } from "../../shared/constants/packSizes";
import { MODE_OPTIONS, fromBackendMode } from "../../shared/constants/modes";
import { queryKeys } from "../../shared/constants/queryKeys";
import "./AdminExperiences.css";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";

/*
إدارة التجارب — lists the packs from GET /admin/packs (real backend data).

How the data flows:
1. useQuery calls getPacks({ page, size }) → the backend sends ONE page of packs.
2. toCard() turns each backend pack into what the card needs
   (mode "seq" → "sequential", tags_count → pieces, price from the fixed price list).
3. The mode filter works on the page we already have
   (the backend can't filter yet — see the note at the bottom of this file).
*/

const modeFilters = [
  {
    value: "all",
    get label() {
      return i18n.t("common.all");
    },
  },
  ...MODE_OPTIONS,
];

// 8 per page on laptop (2 rows of 4, like Figma), 4 on phone (≤ 767px)
function usePerPage() {
  const query = "(max-width: 767px)";
  const [isPhone, setIsPhone] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setIsPhone(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isPhone ? 4 : 8;
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
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const perPage = usePerPage();
  const { accessToken } = useAuth();

  const [mode, setMode] = useState("all");
  const [page, setPage] = useState(1);
  const [packToDelete, setPackToDelete] = useState(null);
  const queryClient = useQueryClient();
  const deletePackMutation = useMutation({
    mutationFn: deletePack,
    onSuccess: async () => {
      setPackToDelete(null);
      setPage(1);
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminPacks() });
    },
  });
  const [notice] = useState(location.state?.notice ?? "");

  // clear the one-time notice from history so refresh doesn't show it again
  useEffect(() => {
    if (location.state?.notice) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  // phone ↔ laptop changes the page size → start again from page 1
  useEffect(() => setPage(1), [perPage]);

  const packsQuery = useQuery({
    queryKey: queryKeys.adminPacks(page, perPage),
    queryFn: ({ signal }) => getPacks({ page, size: perPage, signal }),
    enabled: Boolean(accessToken),
    placeholderData: keepPreviousData, // keep the old page on screen while the next one loads
  });

  const data = packsQuery.data;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, data?.pages ?? 1);

  const visible = useMemo(
    () => (data?.items ?? []).map(toCard).filter((c) => mode === "all" || c.mode === mode),
    [data, mode],
  );

  const filtersOn = mode !== "all";
  const from = (page - 1) * perPage;

  function goTo(p) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearFilters() {
    setMode("all");
  }

  return (
    <div className="admin-exp-view">
      <AppNavbar />

      <main className="admin-exp" aria-labelledby="admin-exp-title">
        <h1 id="admin-exp-title">{t("nav.adminExperiences")}</h1>

        {notice && <InlineMessage type="success" message={notice} />}

        <ConfirmDialog
          open={Boolean(packToDelete)}
          title={t("admin.deletePack.title")}
          description={t("admin.deletePack.description", { id: packToDelete?.id ?? "" })}
          pending={deletePackMutation.isPending}
          onConfirm={() => deletePackMutation.mutate({ pack_id: packToDelete.id })}
          onCancel={() => {
            setPackToDelete(null);
            deletePackMutation.reset();
          }}
        >
          {deletePackMutation.isError && (
            <InlineMessage type="error" message={t("admin.deletePack.failed")} />
          )}
        </ConfirmDialog>

        {/* Figma: filters on the right, outline «إنشاء تجربة جديدة +» on the left */}
        <div className="admin-exp__tools">
          <FilterBar filters={modeFilters} value={mode} onChange={setMode} label={t("admin.experienceType")} />

          <Link to="/admin/experiences/new" className="ui-button ui-button--outline admin-exp__new">
            <span>{t("admin.createNew")}</span>
            <Plus size={18} aria-hidden="true" />
          </Link>
        </div>

        {/* ---------- loading / error / empty / list ---------- */}
        {packsQuery.isPending ? (
          <p className="admin-exp__state" role="status">
            {t("admin.loading")}
          </p>
        ) : packsQuery.isError ? (
          <div className="admin-exp__empty" role="alert">
            <p>
              {packsQuery.error.status === 403
                ? t("admin.adminsOnly")
                : t("admin.loadFailed")}
            </p>
            <button type="button" className="ui-button ui-button--outline" onClick={() => packsQuery.refetch()}>
              {t("common.tryAgain")}
            </button>
          </div>
        ) : total === 0 ? (
          <div className="admin-exp__empty" role="status">
            <p>{t("admin.empty")}</p>
            <Link to="/admin/experiences/new" className="ui-button ui-button--primary">
              {t("admin.createFirst")}
            </Link>
          </div>
        ) : visible.length ? (
          <div className="admin-exp__grid" aria-busy={packsQuery.isFetching}>
            {visible.map((card) => (
              <ExperiencePackCard
                key={card.id}
                variant="admin"
                {...card}
                deleteLabel={t("admin.deletePack.label", { id: card.id })}
                deleteDisabled={deletePackMutation.isPending || packsQuery.isPlaceholderData}
                onDelete={() => setPackToDelete(card)}
              />
            ))}
          </div>
        ) : (
          <div className="admin-exp__empty" role="status">
            <p>{t("admin.noMatch")}</p>
            <button type="button" className="ui-button ui-button--outline" onClick={clearFilters}>
              {t("admin.clearFilters")}
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
                ? t("admin.resultsOnPage", { count: visible.length })
                : t("admin.showingRange", {
                    from: from + 1,
                    to: Math.min(from + perPage, total),
                    total,
                  })
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
