import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, MapPin, Minus, Nfc, Plus, ChevronDown } from "lucide-react";
import AppNavbar from "../../../components/layout/AppNavbar";
import Button from "../../../components/ui/Button";
import { addExperience, getExperience, updateExperience } from "./ExperiencesData";
import "../../../styles/AdminExperiences.css";

/*
The display info (name, description…) has no backend table so i kept it in experiencesData.js.
*/

const MIN_PIECES = 3;
const MAX_PIECES = 30;
const NAME_MAX = 25;

const categories = ["عائلي", "أطفال", "شركات", "تثقيفي", "فعاليات"];
const playerRanges = ["2–10 لاعب", "3–15 لاعب", "4–20 لاعب", "6–30 لاعب", "10–50 لاعب"];

const emptyForm = {
  title: "",
  description: "",
  category: "عائلي",
  place: "",
  players: "4–20 لاعب",
  mode: "sequential",
  pieces: 6,
};

export default function CreateExperiencePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const existing = id ? getExperience(id) : null;
  const isEdit = Boolean(existing);

  const initial = useMemo(
    () => (existing ? { ...emptyForm, ...existing } : emptyForm),
    [existing],
  );
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const leaveRef = useRef(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setPieces = (n) =>
    setForm((f) => ({ ...f, pieces: Math.min(MAX_PIECES, Math.max(MIN_PIECES, n)) }));

  function validate(forPublish) {
    const next = {};
    const title = form.title.trim();
    if (!title) next.title = "اكتب اسم التجربة.";
    else if (title.length > NAME_MAX) next.title = `الاسم لازم يكون ${NAME_MAX} حرف أو أقل.`;
    if (forPublish && !form.place.trim()) next.place = "اكتب المكان عشان يطلع في المتجر.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function save(status) {
    if (!validate(status === "published")) return;
    const data = { ...form, title: form.title.trim(), place: form.place.trim(), status };
    if (isEdit) updateExperience(existing.id, data);
    else addExperience(data);
    const notice =
      status === "draft"
        ? `انحفظت «${data.title}» كمسودة.`
        : isEdit
          ? `انحفظت تعديلات «${data.title}».`
          : `انشأت «${data.title}» وصارت منشورة.`;
    navigate("/admin/experiences", { state: { notice } });
  }

  function cancel() {
    if (dirty) leaveRef.current?.showModal();
    else navigate("/admin/experiences");
  }

  const isSeq = form.mode === "sequential";
  const pageTitle = isEdit ? "تعديل التجربة" : "إنشاء تجربة جديدة";

  return (
    <div className="admin-exp-view" dir="rtl">
      <AppNavbar />

      <main className="admin-exp admin-create" aria-labelledby="create-title">
        <header className="admin-create__header">
          <div className="admin-exp__heading">
            <p className="admin-exp__crumbs">
              <Link to="/home">الرئيسية</Link> › <Link to="/admin/experiences">إدارة التجارب</Link> ›{" "}
              {isEdit ? existing.title : "تجربة جديدة"}
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
            save("published");
          }}
        >
          <div className="admin-create__cards">
            {/* Card 1 — display info (right in RTL) */}
            <section className="admin-card" aria-labelledby="info-title">
              <h2 id="info-title">المعلومات الأساسية</h2>
              <p className="admin-card__sub">هذي البيانات تطلع للاعبين في كرت التجربة.</p>

              <div className="admin-field">
                <label htmlFor="exp-title">
                  اسم التجربة <span className="admin-field__hint">{form.title.length} / {NAME_MAX}</span>
                </label>
                <input
                  id="exp-title"
                  value={form.title}
                  maxLength={NAME_MAX + 5}
                  onChange={set("title")}
                  placeholder="مثلًا: تجربة الكشتة"
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? "exp-title-error" : undefined}
                />
                {errors.title && (
                  <p id="exp-title-error" className="admin-field__error" role="alert">
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="admin-field">
                <label htmlFor="exp-desc">
                  الوصف <span className="admin-field__hint">اختياري</span>
                </label>
                <textarea id="exp-desc" rows={3} value={form.description} onChange={set("description")} />
              </div>

              <div className="admin-field-row">
                <div className="admin-field">
                  <label htmlFor="exp-cat">الفئة</label>
                  <div className="admin-select">
                    <select id="exp-cat" value={form.category} onChange={set("category")}>
                      {categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} aria-hidden="true" />
                  </div>
                </div>

                <div className="admin-field">
                  <label htmlFor="exp-place">المكان</label>
                  <input
                    id="exp-place"
                    value={form.place}
                    onChange={set("place")}
                    placeholder="بر الثمامة، الرياض"
                    aria-invalid={Boolean(errors.place)}
                  />
                  {errors.place && (
                    <p className="admin-field__error" role="alert">
                      {errors.place}
                    </p>
                  )}
                </div>

                <div className="admin-field">
                  <label htmlFor="exp-players">عدد اللاعبين</label>
                  <div className="admin-select">
                    <select id="exp-players" value={form.players} onChange={set("players")}>
                      {playerRanges.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} aria-hidden="true" />
                  </div>
                </div>
              </div>
            </section>

            {/* Card 2 — pack settings (left in RTL) */}
            <section className="admin-card" aria-labelledby="pack-title">
              <h2 id="pack-title">بيانات الباقات</h2>
              <p className="admin-card__sub">تحدد طريقة اللعب وعدد القطع في الباقة.</p>

              <fieldset className="admin-field">
                <legend>نوع الباقة</legend>
                <div className="admin-modes">
                  {[
                    { value: "sequential", title: "تسلسلي", text: "كل قطعة تفتح اللي بعدها", Icon: Nfc },
                    { value: "open", title: "صيد مفتوح", text: "كل القطع متاحة بنفس الوقت", Icon: MapPin },
                  ].map(({ value, title, text, Icon }) => (
                    <label key={value} className="admin-mode">
                      <input
                        type="radio"
                        name="mode"
                        value={value}
                        checked={form.mode === value}
                        onChange={set("mode")}
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

              <div className="admin-field">
                <label htmlFor="exp-pieces">
                  عدد القطع في كل باقة{" "}
                  <span className="admin-field__hint">
                    من {MIN_PIECES} إلى {MAX_PIECES}
                  </span>
                </label>
                <div className="admin-stepper">
                  <button
                    type="button"
                    onClick={() => setPieces(form.pieces + 1)}
                    disabled={form.pieces >= MAX_PIECES}
                    aria-label="زيادة"
                  >
                    <Plus size={18} aria-hidden="true" />
                  </button>
                  <input
                    id="exp-pieces"
                    type="number"
                    inputMode="numeric"
                    min={MIN_PIECES}
                    max={MAX_PIECES}
                    value={form.pieces}
                    onChange={(e) => setPieces(Number(e.target.value) || MIN_PIECES)}
                  />
                  <button
                    type="button"
                    onClick={() => setPieces(form.pieces - 1)}
                    disabled={form.pieces <= MIN_PIECES}
                    aria-label="إنقاص"
                  >
                    <Minus size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <p className="admin-summary">
                <Nfc size={18} aria-hidden="true" />
                كل باقة من هالتجربة تجي بـ {form.pieces} قطع NFC
                {isSeq ? " بترتيب متسلسل." : " متاحة بنفس الوقت."}
              </p>
            </section>
          </div>

          <div className="admin-create__bar">
            <button type="button" className="admin-create__cancel" onClick={cancel}>
              إلغاء
            </button>
            <div className="admin-create__actions">
              <Button type="submit" variant="accent">
                <Check size={18} aria-hidden="true" /> {isEdit ? "احفظ التعديلات" : "أنشئ التجربة"}
              </Button>
              <Button variant="outline" onClick={() => save("draft")}>
                حفظ كمسودة
              </Button>
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
