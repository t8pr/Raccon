import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, X } from "lucide-react";

import AppNavbar from "../../components/layout/AppNavbar";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";
import FilterBar from "../../components/ui/FilterBar";

import Mark from "../../assets/Mark.png";

import { useAuth } from "../../context/AuthContext";
import { getMyEvents, RenameEvent } from "../../api/events/eventsApi";

const statuses = {
  pending: {
    label: "بانتظار الربط",
    tone: "neutral",
  },
  checking: {
    label: "جارٍ التحقق",
    tone: "neutral",
  },
  unavailable: {
    label: "تعذر التحقق",
    tone: "neutral",
  },
  linked: {
    label: "مرتبطة بحسابك",
    tone: "mint",
  },
  other: {
    label: "مرتبطة بحساب آخر",
    tone: "error",
  },
  draft: {
    label: "ما تجهزت",
    tone: "neutral",
  },
  paused: {
    label: "متوقفة",
    tone: "neutral",
  },
  live: {
    label: "شغّالة",
    tone: "neutral",
  },
};

function getModeLabel(mode) {
  if (mode === "sequential" || mode === "seq") {
    return "تسلسلي";
  }

  if (mode === "open") {
    return "صيد مفتوح";
  }

  return "غير محدد";
}

export default function PackagesPage() {
  const auth = useAuth();

  // يمنع بقاء حالات تعديل حساب سابق عند تبديل الحساب.
  return <PackagesContent key={auth.user?.id ?? "guest"} auth={auth} />;
}

function PackagesContent({ auth }) {
  const { user, accessToken, isRestoring, restoreError } = auth;

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [notice, setNotice] = useState("");

  const editTriggerRef = useRef(null);

  const signedIn = Boolean(
    user?.id && accessToken && !isRestoring && !restoreError,
  );

  // الأحداث التابعة للحساب؛ نحتاج event.id للتخصيص.
  const eventsQuery = useQuery({
    queryKey: ["my-events", user?.id],
    queryFn: ({ signal }) => getMyEvents(accessToken, { signal }),
    enabled: signedIn,
    staleTime: 0,
    retry: false,
  });

  const items = signedIn
    ? (eventsQuery.data ?? []).map((event) => {
        const title = event.title?.trim() ?? "";
        const isUntitled =
          !title || /^(untitled(?:\s+event)?|بدون اسم)$/i.test(title);

        return {
          id: event.id,
          eventId: event.id,
          packId: event.pack_id,
          name: isUntitled ? "بدون اسم" : title,
          status: event.status,
          mode: event.mode,
          pieces: event.tags_count,
          coverTone: "mint",
        };
      })
    : [];

  const renameMutation = useMutation({
    mutationFn: ({ eventId, title }) =>
      RenameEvent(eventId, accessToken, title),

    retry: false,

    onSuccess: (updatedEvent) => {
      queryClient.setQueryData(["my-events", user.id], (current) =>
        current?.map((event) =>
          event.id === updatedEvent.id ? { ...event, ...updatedEvent } : event,
        ),
      );

      setNotice("تم حفظ اسم الباقة.");
      closeEditing();

      void queryClient.invalidateQueries({
        queryKey: ["my-events", user.id],
      });
    },

    onError: (error) => {
      setNotice(error.message || "تعذر حفظ الاسم.");
    },
  });

  function getFilterStatus(pkg) {
    if (pkg.status === "live") return "live";
    if (pkg.status === "paused") return "paused";

    return "draft";
  }
  const filters = [
    {
      value: "all",
      label: `الكل ${items.length}`,
    },
    {
      value: "draft",
      label: `ما تجهزت ${
        items.filter((pkg) => getFilterStatus(pkg) === "draft").length
      }`,
    },
    {
      value: "paused",
      label: `متوقفة ${
        items.filter((pkg) => getFilterStatus(pkg) === "paused").length
      }`,
    },
    {
      value: "live",
      label: `شغّالة ${
        items.filter((pkg) => getFilterStatus(pkg) === "live").length
      }`,
    },
  ];

  const visiblePackages = items.filter(
    (pkg) => filter === "all" || getFilterStatus(pkg) === filter,
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

    requestAnimationFrame(() => {
      editTriggerRef.current?.focus();
    });
  }

  function saveName(event, eventId) {
    event.preventDefault();

    if (!signedIn || renameMutation.isPending) return;

    const title = draftName.trim();

    if (!title || title.length > 20) {
      setNotice("اكتب اسمًا من حرف إلى 20 حرفًا.");
      return;
    }

    setNotice("");
    renameMutation.mutate({ eventId, title });
  }

  function openPackage(pkg) {
    navigate(`/customization/${encodeURIComponent(pkg.eventId)}`);
  }

  return (
    <div className="packages-view" dir="rtl">
      <AppNavbar />

      <section className="packages-page" aria-labelledby="packages-title">
        <header className="packages-page__header">
          <h1 id="packages-title">التجارب</h1>
        </header>

        {signedIn && items.length > 0 && (
          <FilterBar
            label="حالة الحزمة"
            filters={filters}
            value={filter}
            onChange={setFilter}
          />
        )}

        <p className="packages-page__announcement" role="status">
          {notice}
        </p>

        {isRestoring ? (
          <p role="status">جارٍ التحقق من الحساب...</p>
        ) : restoreError ? (
          <p role="alert">{restoreError}</p>
        ) : !signedIn ? (
          <div className="packages-page__empty">
            <p>سجّل دخولك لعرض باقاتك.</p>

            <Button onClick={() => navigate("/login")}>تسجيل الدخول</Button>
          </div>
        ) : eventsQuery.isPending ? (
          <p role="status">جارٍ تحميل باقاتك...</p>
        ) : eventsQuery.isError ? (
          <div className="packages-page__empty">
            <p role="alert">{eventsQuery.error.message}</p>

            <Button variant="outline" onClick={() => eventsQuery.refetch()}>
              إعادة المحاولة
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="packages-page__empty">
            <p role="status">لا توجد باقات مرتبطة بحسابك حاليًا.</p>

            <Button onClick={() => navigate("/store")}>استكشف الحزم</Button>
          </div>
        ) : (
          <>
            <div className="packages-page__grid">
              {visiblePackages.map((pkg) => {
                const status = statuses[pkg.status] ?? statuses.linked;

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

                                if (!renameMutation.isPending) {
                                  closeEditing();
                                }
                              }
                            }}
                          >
                            <label
                              className="packages-page__sr-only"
                              htmlFor={`package-name-${pkg.id}`}
                            >
                              اسم الحزمة
                            </label>

                            <input
                              id={`package-name-${pkg.id}`}
                              value={draftName}
                              onChange={(event) =>
                                setDraftName(event.target.value)
                              }
                              maxLength={20}
                              required
                              autoFocus
                              aria-describedby={`name-hint-${pkg.id}`}
                              disabled={renameMutation.isPending}
                            />

                            <Button
                              type="submit"
                              variant="tertiary"
                              className="owned-package__icon-button"
                              disabled={
                                !draftName.trim() || renameMutation.isPending
                              }
                              aria-label="حفظ اسم الحزمة"
                            >
                              <Check size={18} aria-hidden="true" />
                            </Button>

                            <Button
                              variant="tertiary"
                              className="owned-package__icon-button"
                              disabled={renameMutation.isPending}
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
                          <dt>رقم الحزمة</dt>
                          <dd>
                            <bdi>{pkg.packId ?? "يظهر بعد التحقق"}</bdi>
                          </dd>
                        </div>

                        <div>
                          {pkg.mode != null && (
                            <div>
                              <dt>النوع</dt>
                              <dd>{getModeLabel(pkg.mode)}</dd>
                            </div>
                          )}
                        </div>

                        <div>
                          {pkg.pieces != null && (
                            <div>
                              <dt>عدد القطع</dt>
                              <dd>{pkg.pieces} قطعة NFC</dd>
                            </div>
                          )}
                        </div>
                      </dl>

                      <div className="owned-package__actions">
                        <Button fullWidth onClick={() => openPackage(pkg)}>
                          فتح التخصيص
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {visiblePackages.length === 0 && (
              <p className="packages-page__empty" role="status">
                لا توجد حزم مطابقة لهذا الفلتر.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
