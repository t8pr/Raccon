import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, ExternalLink, Eye } from "lucide-react";
import AppNavbar from "../../../components/layout/AppNavbar";
import FilterBar from "../../../components/ui/FilterBar";
import { STORE_PACKAGES, checkoutUrl } from "../../Store/checkoutLinks";
import "../../../styles/AdminExperiences.css";
import "../../../styles/AdminStore.css";

/*
إدارة المتجر — admin view of the user store (/store).

Read-only: the store is a fixed list in pages/Store/checkoutLinks.js
(8 packages = 2 modes × 4 sizes, each with a price and an rmz.gg payment link).
This page shows every package, whether its payment link works, and lets the
admin open or copy the link. To change a price or a link, edit checkoutLinks.js.
*/

const modeFilters = [
  { value: "all", label: "الكل" },
  { value: "sequential", label: "تسلسلي" },
  { value: "open", label: "صيد مفتوح" },
];

const modeLabel = { sequential: "تسلسلي", open: "صيد مفتوح" };

// static list → rows with the checked link
const rows = STORE_PACKAGES.map((pkg) => ({
  ...pkg,
  link: checkoutUrl(pkg.purchaseUrl),
}));

const readyCount = rows.filter((row) => row.link).length;

function shortLink(url) {
  const { host, pathname } = new URL(url);
  return `${host}${pathname}`;
}

export default function AdminStorePage() {
  const [mode, setMode] = useState("all");
  const [copiedId, setCopiedId] = useState(null);
  const [copyError, setCopyError] = useState("");

  const visible = rows.filter((row) => mode === "all" || row.mode === mode);

  async function copyLink(row) {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(row.link);
      setCopiedId(row.id);
      window.setTimeout(
        () => setCopiedId((id) => (id === row.id ? null : id)),
        2000,
      );
    } catch {
      setCopyError("ما قدرنا ننسخ الرابط. انسخه يدويًا من عمود الرابط.");
    }
  }

  return (
    <div className="admin-exp-view" dir="rtl">
      <AppNavbar />

      <main className="admin-exp admin-store" aria-labelledby="admin-store-title">
        <header className="admin-exp__header">
          <div className="admin-exp__heading">
            <p className="admin-exp__crumbs">
              <Link to="/home">الرئيسية</Link> › إدارة المتجر
            </p>
            <h1 id="admin-store-title">إدارة المتجر</h1>
            <p className="admin-exp__intro">
              الباقات اللي يشوفها المستخدم في المتجر — {rows.length} باقات
            </p>
          </div>

          <Link
            to="/store"
            className="ui-button ui-button--outline admin-store__preview"
          >
            <Eye size={18} aria-hidden="true" />
            <span>معاينة المتجر</span>
          </Link>
        </header>

        {/* summary */}
        <ul className="admin-store__stats" aria-label="ملخص المتجر">
          <li className="admin-store__stat">
            <span className="admin-store__stat-value">{rows.length}</span>
            <span className="admin-store__stat-label">كل الباقات</span>
          </li>
          <li className="admin-store__stat">
            <span className="admin-store__stat-value">{readyCount}</span>
            <span className="admin-store__stat-label">رابط الدفع جاهز</span>
          </li>
          <li
            className={`admin-store__stat${
              rows.length - readyCount ? " admin-store__stat--warn" : ""
            }`}
          >
            <span className="admin-store__stat-value">
              {rows.length - readyCount}
            </span>
            <span className="admin-store__stat-label">بدون رابط</span>
          </li>
        </ul>

        <div className="admin-exp__tools">
          <FilterBar
            filters={modeFilters}
            value={mode}
            onChange={setMode}
            label="طريقة اللعب"
          />
        </div>

        {copyError && (
          <p className="admin-store__error" role="alert">
            {copyError}
          </p>
        )}

        {/* laptop: table · phone: each row becomes a card (CSS) */}
        <div className="admin-store__table-wrap">
          <table className="admin-store__table">
            <caption className="admin-store__sr">
              باقات المتجر وأسعارها وروابط الدفع
            </caption>
            <thead>
              <tr>
                <th scope="col">الباقة</th>
                <th scope="col">طريقة اللعب</th>
                <th scope="col">عدد القطع</th>
                <th scope="col">السعر</th>
                <th scope="col">رابط الدفع</th>
                <th scope="col">
                  <span className="admin-store__sr">إجراءات</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  <th scope="row" data-label="الباقة">
                    <bdi className="admin-store__id">{row.id}</bdi>
                  </th>
                  <td data-label="طريقة اللعب">
                    <span
                      className={`admin-store__mode admin-store__mode--${row.mode}`}
                    >
                      {modeLabel[row.mode]}
                    </span>
                  </td>
                  <td data-label="عدد القطع">{row.pieces} قطعة</td>
                  <td data-label="السعر">
                    <span>
                      <strong>{row.price}</strong> ر.س
                    </span>
                  </td>
                  <td data-label="رابط الدفع">
                    {row.link ? (
                      <span className="admin-store__link">
                        <span className="admin-store__dot" aria-hidden="true" />
                        <bdi dir="ltr">{shortLink(row.link)}</bdi>
                      </span>
                    ) : (
                      <span className="admin-store__link admin-store__link--missing">
                        <span className="admin-store__dot" aria-hidden="true" />
                        ما فيه رابط صالح
                      </span>
                    )}
                  </td>
                  <td className="admin-store__actions">
                    {row.link && (
                      <>
                        <a
                          className="admin-store__icon"
                          href={row.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`افتح صفحة الدفع: ${row.id}`}
                          title="افتح صفحة الدفع"
                        >
                          <ExternalLink size={18} aria-hidden="true" />
                        </a>
                        <button
                          type="button"
                          className="admin-store__icon"
                          onClick={() => copyLink(row)}
                          aria-label={`انسخ رابط الدفع: ${row.id}`}
                          title="انسخ الرابط"
                        >
                          {copiedId === row.id ? (
                            <Check size={18} aria-hidden="true" />
                          ) : (
                            <Copy size={18} aria-hidden="true" />
                          )}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="admin-store__live" aria-live="polite">
          {copiedId ? "تم نسخ الرابط" : ""}
        </p>

        <p className="admin-store__note">
          الأسعار والروابط ثابتة في الكود. لتعديلها عدّل ملف{" "}
          <bdi dir="ltr">pages/Store/checkoutLinks.js</bdi> وأعد نشر الموقع.
        </p>
      </main>
    </div>
  );
}
