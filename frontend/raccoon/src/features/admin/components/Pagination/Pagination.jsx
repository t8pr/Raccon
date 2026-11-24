import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

// Page numbers with "…" (1 2 … 5 6). On phones CSS swaps them for "صفحة x من y".
function pageList(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

export default function Pagination({ page, totalPages, onChange, summary }) {
  const { t } = useTranslation();
  if (totalPages <= 1) {
    return summary ? <p className="pagination__summary">{summary}</p> : null;
  }

  return (
    <nav className="pagination" aria-label={t("admin.pagination.label")}>
      {/* RTL: «السابق» on the right, «التالي» on the left */}
      <button
        type="button"
        className="pagination__step"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
      >
        <ChevronRight size={16} aria-hidden="true" />
        {t("admin.pagination.previous")}
      </button>

      <ol className="pagination__pages">
        {pageList(page, totalPages).map((p, i) =>
          p === "…" ? (
            <li key={`gap-${i}`} className="pagination__gap" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                className="pagination__page"
                aria-current={p === page ? "page" : undefined}
                aria-label={t("admin.pagination.page", { page: p })}
                onClick={() => onChange(p)}
              >
                {p}
              </button>
            </li>
          ),
        )}
      </ol>

      <p className="pagination__compact" aria-live="polite">
        {t("admin.pagination.pageOf", { page, total: totalPages })}
      </p>

      <button
        type="button"
        className="pagination__step"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
      >
        {t("admin.pagination.next")}
        <ChevronLeft size={16} aria-hidden="true" />
      </button>

      {summary && <p className="pagination__summary">{summary}</p>}
    </nav>
  );
}
