import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Pencil, X } from "lucide-react";

import AppNavbar from "../../components/layout/AppNavbar";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";
import FilterBar from "../../components/ui/FilterBar";
import Mark from "../../assets/Mark.png";

import { myPackages } from "./myPackages";

const statuses = {
  draft: { label: "ما تجهزت", tone: "neutral" },
  // paused قد تعني حفظ التجهيز، ولا تؤكد اكتماله.
  paused: { label: "متوقفة", tone: "neutral" },
  live: { label: "شغّالة", tone: "neutral" },
};

export default function PackagesPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState(myPackages);
  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [notice, setNotice] = useState("");

  const editTriggerRef = useRef(null);

  const filters = [
    {
      value: "all",
      label: `الكل ${items.length}`,
    },
    ...Object.entries(statuses).map(([value, status]) => ({
      value,
      label: `${status.label} ${
        items.filter((pkg) => pkg.status === value).length
      }`,
    })),
  ];

  const visiblePackages = items.filter(
    (pkg) => filter === "all" || pkg.status === filter,
  );

  function startEditing(pkg, event) {
    editTriggerRef.current = event.currentTarget;
    setEditingId(pkg.id);
    setDraftName(pkg.name === "بدون اسم" ? "" : pkg.name);
    setNotice("");
  }

  function closeEditing() {
    setEditingId(null);
    setDraftName("");

    // نعيد التركيز إلى القلم بعد رجوعه للواجهة.
    requestAnimationFrame(() => {
      editTriggerRef.current?.focus();
    });
  }

  function saveName(event, id) {
    event.preventDefault();

    const name = draftName.trim();

    if (!name || name.length > 20) return;

    setItems((current) =>
      current.map((pkg) => (pkg.id === id ? { ...pkg, name } : pkg)),
    );

    setNotice("تم تحديث الاسم في المعاينة.");
    closeEditing();
  }

  return (
    <div className="packages-view" dir="rtl">
      <AppNavbar />

      <section className="packages-page" aria-labelledby="packages-title">
        <header className="packages-page__header">
          <h1 id="packages-title">باقاتي</h1>
        </header>

        <FilterBar
          label="حالة الباكج"
          filters={filters}
          value={filter}
          onChange={setFilter}
        />

        <p className="packages-page__announcement" role="status">
          {notice}
        </p>

        <div className="packages-page__grid">
          {visiblePackages.map((pkg) => {
            const status = statuses[pkg.status];
            const isEditing = editingId === pkg.id;

            return (
              <article
                key={pkg.id}
                className="package-card owned-package"
                aria-labelledby={`package-title-${pkg.id}`}
              >
                <div
                  className={`package-card__cover package-card__cover--${pkg.coverTone}`}
                >
                  {/* نفس رسمة غلاف المتجر */}
                  <div className="package-card__art" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />

                    <span
                      style={{
                        maskImage: `url(${Mark})`,
                        WebkitMaskImage: `url(${Mark})`,
                      }}
                    />
                  </div>

                  <div className="owned-package__badges">
                    <div aria-hidden="true" />

                    <Chip tone={status.tone}>{status.label}</Chip>
                  </div>
                </div>

                <div className="owned-package__body">
                  <div className="owned-package__heading">
                    {isEditing ? (
                      <form
                        className="owned-package__rename"
                        onSubmit={(event) => saveName(event, pkg.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            event.preventDefault();
                            closeEditing();
                          }
                        }}
                      >
                        <label
                          className="packages-page__sr-only"
                          htmlFor={`package-name-${pkg.id}`}
                        >
                          اسم الباكج
                        </label>

                        <input
                          id={`package-name-${pkg.id}`}
                          value={draftName}
                          onChange={(event) => setDraftName(event.target.value)}
                          maxLength={20}
                          required
                          autoFocus
                          aria-describedby={`name-hint-${pkg.id}`}
                        />

                        <Button
                          type="submit"
                          variant="tertiary"
                          className="owned-package__icon-button"
                          disabled={!draftName.trim()}
                          aria-label="حفظ اسم الباكج"
                        >
                          <Check size={18} aria-hidden="true" />
                        </Button>

                        <Button
                          variant="tertiary"
                          className="owned-package__icon-button"
                          onClick={closeEditing}
                          aria-label="إلغاء تعديل الاسم"
                        >
                          <X size={18} aria-hidden="true" />
                        </Button>

                        <small id={`name-hint-${pkg.id}`}>
                          {draftName.length}/20 حرف
                        </small>

                        <h2
                          id={`package-title-${pkg.id}`}
                          className="packages-page__sr-only"
                        >
                          {pkg.name}
                        </h2>
                      </form>
                    ) : (
                      <>
                        <h2 id={`package-title-${pkg.id}`}>{pkg.name}</h2>

                        <Button
                          variant="tertiary"
                          className="owned-package__icon-button"
                          onClick={(event) => startEditing(pkg, event)}
                          aria-label={`تعديل اسم ${pkg.name}`}
                        >
                          <Pencil size={18} aria-hidden="true" />
                        </Button>
                      </>
                    )}
                  </div>

                  <dl className="owned-package__info">
                    <div>
                      <dt>رقم الباكج</dt>
                      <dd>
                        <bdi>{pkg.id}</bdi>
                      </dd>
                    </div>

                    <div>
                      <dt>النوع</dt>
                      <dd>
                        {pkg.mode === "sequential" ? "تسلسلي" : "صيد مفتوح"}
                      </dd>
                    </div>

                    <div>
                      <dt>عدد القطع</dt>
                      <dd>{pkg.pieces} قطعة NFC</dd>
                    </div>
                  </dl>

                  <div className="owned-package__progress">
                    <div className="owned-package__progress-label">
                      <label htmlFor={`progress-${pkg.id}`}>
                        القطع المحفوظة
                      </label>

                      <bdi>
                        {pkg.savedPieces}/{pkg.pieces}
                      </bdi>
                    </div>

                    <progress
                      id={`progress-${pkg.id}`}
                      max={pkg.pieces}
                      value={pkg.savedPieces}
                    />
                  </div>

                  <div className="owned-package__actions">
                    <Button
                      variant="primary"
                      onClick={() =>
                        navigate(`/customization/${encodeURIComponent(pkg.id)}`)
                      }
                    >
                      فتح التخصيص
                    </Button>

                    <Button variant="outline">إدارة</Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {visiblePackages.length === 0 && (
          <p className="packages-page__empty" role="status">
            ما عندك باقات بهذه الحالة حاليًا.
          </p>
        )}
      </section>
    </div>
  );
}
