import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, MapPin, Minus, Nfc, Plus } from "lucide-react";
import AppNavbar from "../../shared/layout/AppNavbar/AppNavbar";
import Button from "../../shared/ui/Button/Button";
import InlineMessage from "../../shared/ui/InlineMessage/InlineMessage";
import ExperiencePackCard from "../../shared/ui/ExperiencePackCard/ExperiencePackCard";
import { generatePacks } from "./api";
import {
  PACK_SIZES,
  PRICE_PER_PIECE,
  piecesLabel,
  priceFor,
} from "../../shared/constants/packSizes";
import { MODE, MODE_LABEL, toBackendMode } from "../../shared/constants/modes";
import { queryKeys } from "../../shared/constants/queryKeys";
import "./AdminExperiences.css";
import { useTranslation } from "react-i18next";

/*
Create experiences (Figma: Admin · create experience · 1441 / 1442).
The admin picks: mode, pack size, how many → POST /admin/generate-packs
  { mode: "seq" | "open", tags_count: 6 | 10 | 15 | 21, quantity: 3–30 }
The price isn't sent: it's fixed per size (packSizes.js), the preview just shows it.
*/

const MIN_QTY = 3;
const MAX_QTY = 30;

const MODES = [
  // العنوان من MODE_LABEL والوصف مفتاح ترجمة، الاثنين ينقرون وقت العرض
  { value: MODE.SEQUENTIAL, text: "admin.create.modeSeqText", Icon: Nfc },
  { value: MODE.OPEN, text: "admin.create.modeOpenText", Icon: MapPin },
];

const emptyForm = {
  mode: "sequential",
  pieces: PACK_SIZES[0].pieces,
  quantity: MIN_QTY,
};

export default function CreateExperiencePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(emptyForm);
  const leaveRef = useRef(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(emptyForm);
  const price = priceFor(form.pieces);
  const isSeq = form.mode === "sequential";

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setQuantity = (n) =>
    setField("quantity", Math.min(MAX_QTY, Math.max(MIN_QTY, n)));

  // useMutation = "send something to the backend that changes data"
  const createMutation = useMutation({
    mutationFn: () =>
      generatePacks({
        mode: toBackendMode(form.mode),
        tagsCount: form.pieces,
        quantity: form.quantity,
      }),
    onSuccess: (createdPacks) => {
      // the list page has old data in its cache → mark it old so it loads again
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPacks() });
      const label = `${MODE_LABEL[form.mode]} · ${piecesLabel(form.pieces)}`;
      navigate("/admin/experiences", {
        state: {
          notice: t("admin.create.createdNotice", {
            count: createdPacks.length,
            label,
          }),
        },
      });
    },
  });

  const errorMessage = createMutation.isError
    ? createMutation.error.status === 403
      ? t("admin.create.noPermission")
      : createMutation.error.status === 422
        ? t("admin.create.invalidData")
        : t("admin.create.failed")
    : "";

  function cancel() {
    if (dirty) leaveRef.current?.showModal();
    else navigate("/admin/experiences");
  }

  const pageTitle = t("admin.createNew");

  return (
    <div className="admin-exp-view">
      <AppNavbar />

      <main className="admin-exp admin-create" aria-labelledby="create-title">
        <header className="admin-create__header">
          <div className="admin-exp__heading">
            <p className="admin-exp__crumbs">
              <Link to="/home">{t("nav.home")}</Link> ›{" "}
              <Link to="/admin/experiences">{t("nav.adminExperiences")}</Link> ›{" "}
              {pageTitle}
            </p>
            <h1 id="create-title">{pageTitle}</h1>
          </div>
          {/* phone: cancel sits next to the title (bottom bar only has room for 2 buttons) */}
          <button type="button" className="admin-create__cancel-top" onClick={cancel}>
            {t("common.cancel")}
          </button>
        </header>

        <form
          className="admin-create__form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!createMutation.isPending) createMutation.mutate();
          }}
        >
          {/* ---------- card 1: experience data ---------- */}
          <section
            className={`admin-card ${isSeq ? "admin-card--seq" : "admin-card--open"}`}
            aria-labelledby="exp-data-title"
          >
            <h2 id="exp-data-title">{t("admin.create.dataTitle")}</h2>
            <p className="admin-card__sub">{t("admin.create.dataSub")}</p>

            <fieldset className="admin-field">
              <legend>{t("admin.experienceType")}</legend>
              <div className="admin-modes">
                {MODES.map(({ value, text, Icon }) => (
                  <label key={value} className="admin-mode">
                    <input
                      type="radio"
                      name="mode"
                      value={value}
                      checked={form.mode === value}
                      onChange={() => setField("mode", value)}
                    />
                    <span className="admin-mode__text">
                      <strong>{MODE_LABEL[value]}</strong>
                      <small>{t(text)}</small>
                    </span>
                    <Icon size={22} aria-hidden="true" />
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="admin-create__row">
              <fieldset className="admin-field admin-sizes-field" aria-describedby="size-hint">
                <legend>
                  {t("admin.create.size")}{" "}
                  <span className="admin-field__hint">{t("admin.create.sizeHint")}</span>
                </legend>
                <div className="admin-sizes">
                  {PACK_SIZES.map((size) => (
                    <label key={size.pieces} className="admin-size">
                      <input
                        type="radio"
                        name="pieces"
                        value={size.pieces}
                        checked={form.pieces === size.pieces}
                        onChange={() => setField("pieces", size.pieces)}
                      />
                      <strong>{piecesLabel(size.pieces)}</strong>
                      <span className="admin-size__price">
                        {size.price}{" "}
                        <span aria-label={t("common.currencyName")}>{t("common.currency")}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <p id="size-hint" className="admin-field__note">
                  {t("admin.create.pricePerPiece", { price: PRICE_PER_PIECE })}
                </p>
              </fieldset>

              <div className="admin-field admin-qty-field">
                <label htmlFor="exp-qty">
                  {t("admin.create.quantity")}{" "}
                  <span className="admin-field__hint">
                    {t("admin.create.quantityRange", { min: MIN_QTY, max: MAX_QTY })}
                  </span>
                </label>
                <div className="admin-stepper">
                  <button
                    type="button"
                    onClick={() => setQuantity(form.quantity + 1)}
                    disabled={form.quantity >= MAX_QTY}
                    aria-label={t("common.increase")}
                  >
                    <Plus size={18} aria-hidden="true" />
                  </button>
                  <input
                    id="exp-qty"
                    type="number"
                    inputMode="numeric"
                    min={MIN_QTY}
                    max={MAX_QTY}
                    value={form.quantity}
                    onChange={(e) => setQuantity(Number(e.target.value) || MIN_QTY)}
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(form.quantity - 1)}
                    disabled={form.quantity <= MIN_QTY}
                    aria-label={t("common.decrease")}
                  >
                    <Minus size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            <p className="admin-summary">
              <Nfc size={18} aria-hidden="true" />
              {t(isSeq ? "admin.create.summarySeq" : "admin.create.summaryOpen", {
                pieces: piecesLabel(form.pieces),
              })}
            </p>
          </section>

          {/* ---------- card 2: store preview ---------- */}
          <section
            className={`admin-card admin-preview ${isSeq ? "admin-card--seq" : "admin-card--open"}`}
            aria-labelledby="preview-title"
          >
            <div className="admin-preview__text">
              <h2 id="preview-title">{t("admin.create.previewTitle")}</h2>
              <p className="admin-card__sub">
                {t("admin.create.previewSub")}
              </p>
              <ul className="admin-preview__checks">
                {["admin.experienceType", "admin.create.size", "admin.create.priceAuto"].map((item) => (
                  <li key={item}>
                    <Check size={14} aria-hidden="true" />
                    {t(item)}
                  </li>
                ))}
              </ul>
              <p className="admin-preview__note">
                {t("admin.create.previewNote")}
              </p>
            </div>

            {/* live preview: read-only, announced as one sentence for screen readers */}
            <div className="admin-preview__card">
              <p className="pack-card__sr" aria-live="polite">
                {t("admin.create.previewSr", {
                  mode: MODE_LABEL[form.mode],
                  pieces: piecesLabel(form.pieces),
                  price,
                })}
              </p>
              <div inert aria-hidden="true">
                <ExperiencePackCard
                  variant="store"
                  mode={form.mode}
                  pieces={form.pieces}
                  price={price}
                />
              </div>
            </div>
          </section>

          {errorMessage && <InlineMessage type="error" message={errorMessage} />}

          <div
            className={`admin-create__bar ${isSeq ? "admin-create__bar--seq" : "admin-create__bar--open"}`}
          >
            <button type="button" className="admin-create__cancel" onClick={cancel}>
              {t("common.cancel")}
            </button>
            <div className="admin-create__actions">
              <Button type="submit" variant="primary" loading={createMutation.isPending}>
                {t("admin.create.submit")}
              </Button>
              {/* "حفظ كمسودة" comes back when the backend can save drafts (packs have no status yet) */}
            </div>
          </div>
        </form>
      </main>

      <dialog ref={leaveRef} className="admin-leave" aria-labelledby="leave-title">
        <h2 id="leave-title">{t("admin.create.leaveTitle")}</h2>
        <p>{t("admin.create.leaveText")}</p>
        <div className="admin-leave__actions">
          <Button variant="outline" onClick={() => leaveRef.current?.close()}>
            {t("admin.create.keepEditing")}
          </Button>
          <Button variant="primary" onClick={() => navigate("/admin/experiences")}>
            {t("admin.create.leaveWithoutSaving")}
          </Button>
        </div>
      </dialog>
    </div>
  );
}
