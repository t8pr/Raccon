import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, MapPin, Minus, Nfc, Plus } from "lucide-react";
import AppNavbar from "../../../components/layout/AppNavbar";
import Button from "../../../components/ui/Button";
import InlineMessage from "../../../components/ui/InlineMessage";
import ExperiencePackCard from "../../../components/ui/ExperiencePackCard";
import { useAuth } from "../../../context/AuthContext";
import { generatePacks } from "../../../api/admin/adminApi";
import {
  MODE_LABEL,
  PACK_SIZES,
  PRICE_PER_PIECE,
  piecesLabel,
  priceFor,
  toBackendMode,
} from "./packSizes";
import "../../../styles/AdminExperiences.css";

/*
Create experiences (Figma: Admin · create experience · 1441 / 1442).
The admin picks: mode, pack size, how many → POST /admin/generate-packs
  { mode: "seq" | "open", tags_count: 6 | 10 | 15 | 21, quantity: 3–30 }
The price isn't sent: it's fixed per size (packSizes.js), the preview just shows it.
*/

const MIN_QTY = 3;
const MAX_QTY = 30;

const MODES = [
  { value: "sequential", title: "تسلسلي", text: "كل قطعة تفتح اللي بعدها", Icon: Nfc },
  { value: "open", title: "صيد مفتوح", text: "كل القطع متاحة بنفس الوقت", Icon: MapPin },
];

const emptyForm = {
  mode: "sequential",
  pieces: PACK_SIZES[0].pieces,
  quantity: MIN_QTY,
};

export default function CreateExperiencePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();

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
      generatePacks(accessToken, {
        mode: toBackendMode(form.mode),
        tagsCount: form.pieces,
        quantity: form.quantity,
      }),
    onSuccess: (createdPacks) => {
      // the list page has old data in its cache → mark it old so it loads again
      queryClient.invalidateQueries({ queryKey: ["admin-packs"] });
      const label = `${MODE_LABEL[form.mode]} · ${piecesLabel(form.pieces)}`;
      navigate("/admin/experiences", {
        state: { notice: `انشأت ${createdPacks.length} تجارب (${label}).` },
      });
    },
  });

  const errorMessage = createMutation.isError
    ? createMutation.error.status === 403
      ? "ما عندك صلاحية تنشئ تجارب. لازم يكون حسابك مشرف."
      : createMutation.error.status === 422
        ? "فيه بيانات ناقصة أو غلط. راجع الاختيارات وجرّب مرة ثانية."
        : "تعذر إنشاء التجربة. تأكد إن الباك إند شغّال وحاول مرة ثانية."
    : "";

  function cancel() {
    if (dirty) leaveRef.current?.showModal();
    else navigate("/admin/experiences");
  }

  const pageTitle = "إنشاء تجربة جديدة";

  return (
    <div className="admin-exp-view" dir="rtl">
      <AppNavbar />

      <main className="admin-exp admin-create" aria-labelledby="create-title">
        <header className="admin-create__header">
          <div className="admin-exp__heading">
            <p className="admin-exp__crumbs">
              <Link to="/home">الرئيسية</Link> › <Link to="/admin/experiences">إدارة التجارب</Link> ›{" "}
              {pageTitle}
            </p>
            <h1 id="create-title">{pageTitle}</h1>
          </div>
          {/* phone: cancel sits next to the title (bottom bar only has room for 2 buttons) */}
          <button type="button" className="admin-create__cancel-top" onClick={cancel}>
            إلغاء
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
          <section className="admin-card" aria-labelledby="exp-data-title">
            <h2 id="exp-data-title">بيانات التجارب</h2>
            <p className="admin-card__sub">تحدد طريقة اللعب وعدد القطع في التجربة.</p>

            <fieldset className="admin-field">
              <legend>نوع التجربة</legend>
              <div className="admin-modes">
                {MODES.map(({ value, title, text, Icon }) => (
                  <label key={value} className="admin-mode">
                    <input
                      type="radio"
                      name="mode"
                      value={value}
                      checked={form.mode === value}
                      onChange={() => setField("mode", value)}
                    />
                    <span className="admin-mode__text">
                      <strong>{title}</strong>
                      <small>{text}</small>
                    </span>
                    <Icon size={22} aria-hidden="true" />
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="admin-create__row">
              <fieldset className="admin-field admin-sizes-field" aria-describedby="size-hint">
                <legend>
                  حجم التجربة <span className="admin-field__hint">السعر ثابت لكل حجم</span>
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
                        {size.price} <span aria-label="ريال سعودي">ر.س</span>
                      </span>
                    </label>
                  ))}
                </div>
                <p id="size-hint" className="admin-field__note">
                  {PRICE_PER_PIECE} ر.س للقطعة — السعر يتحدد تلقائيًا حسب حجم التجربة.
                </p>
              </fieldset>

              <div className="admin-field admin-qty-field">
                <label htmlFor="exp-qty">
                  عدد التجارب{" "}
                  <span className="admin-field__hint">
                    من {MIN_QTY} إلى {MAX_QTY}
                  </span>
                </label>
                <div className="admin-stepper">
                  <button
                    type="button"
                    onClick={() => setQuantity(form.quantity + 1)}
                    disabled={form.quantity >= MAX_QTY}
                    aria-label="زيادة"
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
                    aria-label="إنقاص"
                  >
                    <Minus size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            <p className="admin-summary">
              <Nfc size={18} aria-hidden="true" />
              كل تجربة تجي بـ {piecesLabel(form.pieces)} NFC
              {isSeq ? " بترتيب متسلسل." : " متاحة بنفس الوقت."}
            </p>
          </section>

          {/* ---------- card 2: store preview ---------- */}
          <section className="admin-card admin-preview" aria-labelledby="preview-title">
            <div className="admin-preview__text">
              <h2 id="preview-title">كذا بتطلع في المتجر</h2>
              <p className="admin-card__sub">
                المعاينة تتغيّر مع اختياراتك: نوع التجربة يحدد لون الكرت، وحجم التجربة يحدد عدد
                القطع والسعر.
              </p>
              <ul className="admin-preview__checks">
                {["نوع التجربة", "حجم التجربة", "السعر (تلقائي)"].map((item) => (
                  <li key={item}>
                    <Check size={14} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="admin-preview__note">
                تطلع في المتجر بعد «أنشئ التجربة».
              </p>
            </div>

            {/* live preview: read-only, announced as one sentence for screen readers */}
            <div className="admin-preview__card">
              <p className="pack-card__sr" aria-live="polite">
                المعاينة: {MODE_LABEL[form.mode]}، {piecesLabel(form.pieces)}، {price} ريال.
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

          <div className="admin-create__bar">
            <button type="button" className="admin-create__cancel" onClick={cancel}>
              إلغاء
            </button>
            <div className="admin-create__actions">
              <Button type="submit" variant="primary" loading={createMutation.isPending}>
                أنشئ التجربة
              </Button>
              {/* "حفظ كمسودة" comes back when the backend can save drafts (packs have no status yet) */}
            </div>
          </div>
        </form>
      </main>

      <dialog ref={leaveRef} className="admin-leave" aria-labelledby="leave-title">
        <h2 id="leave-title">متأكد تبي تطلع؟</h2>
        <p>ما راح تنحفظ التغييرات اللي سويتها.</p>
        <div className="admin-leave__actions">
          <Button variant="outline" onClick={() => leaveRef.current?.close()}>
            كمّل التعديل
          </Button>
          <Button variant="primary" onClick={() => navigate("/admin/experiences")}>
            اطلع بدون حفظ
          </Button>
        </div>
      </dialog>
    </div>
  );
}
