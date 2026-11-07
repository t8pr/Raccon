import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Dialog } from "radix-ui";
import { Pencil, LockKeyhole, Trash2, X, Check } from "lucide-react";

import AppNavbar from "../../components/layout/AppNavbar";
import Button from "../../components/ui/Button";
import AuthField from "../../components/ui/AuthField";
import CharacterPicker from "../../components/ui/CharacterPicker";
import InlineMessage from "../../components/ui/InlineMessage";
import { avatarImages } from "../../components/ui/avatarImages";

import { useAuth } from "../../context/AuthContext";
import { updateProfile } from "../../api/users/usersApi";
import { changePassword, deleteAccount } from "../../api/auth/authApi";
import { getProfileSchema, validateForm } from "../../utils/validation";

// الحقول التي يمكن تعديلها منفردة.
const fields = {
  name: "الاسم",
  username: "اسم المستخدم",
  phone_number: "رقم الجوال",
};

// عنوان النافذة حسب نوع التعديل.
const titles = {
  avatar: "غيّر شخصيتك",
  name: "تعديل الاسم",
  username: "تعديل اسم المستخدم",
  phone_number: "تعديل رقم الجوال",
  password: "تغيير كلمة المرور",
  delete: "حذف الحساب",
};

// ترتيب صفوف معلومات الحساب.
const informationRows = [
  "name",
  "username",
  "email",
  "phone_number",
  "password",
];

// حقول نافذة تغيير كلمة المرور.
const passwordFields = [
  ["old_password", "كلمة المرور الحالية"],
  ["new_password", "كلمة المرور الجديدة"],
  ["confirmation", "تأكيد كلمة المرور"],
];

export default function ProfilePage() {
  const { user, accessToken, updateUser, clearSession, markAccountDeleted } =
    useAuth();

  const navigate = useNavigate();

  // حالة الواجهة تبقى محلية؛ Query تدير طلبات الباك إند.
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleted, setDeleted] = useState(false);

  // الزر الذي فتح النافذة، لإعادة التركيز إليه عند الإغلاق.
  const trigger = useRef(null);

  // يمنع إرسال طلبين قبل إعادة رسم الواجهة.
  const pending = useRef(false);

  const profileMutation = useMutation({
    mutationFn: ({ kind, values }) => {
      if (kind === "delete") {
        return deleteAccount(accessToken);
      }

      if (kind === "password") {
        return changePassword(accessToken, values);
      }

      return updateProfile(accessToken, values);
    },

    // لا نعيد تنفيذ الحفظ أو الحذف تلقائيًا عند الفشل.
    retry: false,

    // إزالة العملية من الكاش بعد أن تصبح غير مستخدمة.
    gcTime: 0,

    onSuccess: async (result, variables) => {
      if (variables.kind === "delete") {
        // يزيل التوكن المحفوظ ويوقف جلب الحساب المحذوف،
        // مع الاحتفاظ بالعرض مؤقتًا خلف نافذة النجاح.
        await markAccountDeleted();

        setDeleted(true);
        setDraft({});
        return;
      }

      if (variables.kind === "password") {
        setNotice("تم تغيير كلمة المرور.");
      } else {
        // تحديث كاش الحساب من استجابة الباك إند.
        // البروفايل والنافبار يقرآن نفس بيانات المستخدم.
        await updateUser(result);

        setNotice("تم حفظ التغييرات.");
      }

      setEditing(null);
      setDraft({});
    },

    onError: (requestError) => {
      if (requestError.status === 401) {
        setError("انتهت جلسة الدخول. سجّل الدخول مجددًا.");
      } else if (requestError.status === 400 || requestError.status === 409) {
        setError("كلمة المرور الحالية غير صحيحة.");
      } else {
        setError("تعذر تنفيذ الطلب. حاول مرة أخرى.");
      }
    },

    onSettled: () => {
      pending.current = false;

      // الرسائل محفوظة في error وnotice.
      // لا نحتاج الاحتفاظ بمتغيرات العملية بعد انتهائها.
      profileMutation.reset();
    },
  });

  // بديل useState الخاص بالتحميل.
  const busy = profileMutation.isPending;

  // جميع Hooks أعلاه، قبل أي return شرطي.
  if (!user) {
    return (
      <p dir="rtl" role="status">
        بيانات الحساب غير متاحة. سجّل الدخول مجددًا.
      </p>
    );
  }

  const avatarSrc = avatarImages[Number(user.avatar_id)] || avatarImages[1];

  function open(field, event) {
    if (pending.current || busy) return;

    trigger.current = event.currentTarget;

    if (field === "avatar") {
      setDraft({
        avatar_id: Number(user.avatar_id) || 1,
      });
    } else if (field === "password") {
      setDraft({
        old_password: "",
        new_password: "",
        confirmation: "",
      });
    } else if (field === "delete") {
      setDraft({
        confirmation: "",
      });
    } else {
      setDraft({
        [field]: user[field] || "",
      });
    }

    setError("");
    setNotice("");
    setEditing(field);
  }

  function close() {
    if (pending.current || busy) return;

    if (deleted) {
      clearSession();
      navigate("/", { replace: true });
    }

    setEditing(null);
    setDraft({});
    setError("");
  }

  function change(key) {
    return (event) => {
      setDraft((previous) => ({
        ...previous,
        [key]: event.target.value,
      }));
    };
  }

  function displayValue(field) {
    if (field === "password") {
      return "••••••••";
    }

    if (field === "phone_number") {
      return `+966 ${user.phone_number}`;
    }

    return user[field];
  }

  function save(event) {
    event.preventDefault();

    if (pending.current || busy || !user) return;

    setError("");

    const schema = getProfileSchema(editing, user.username);

    if (!schema) return;

    const result = validateForm(schema, draft);

    if (!result.success) {
      // نحافظ على عرض الخطأ في InlineMessage الحالية.
      setError(Object.values(result.errors)[0] || "تحقق من البيانات المدخلة.");
      return;
    }

    pending.current = true;

    profileMutation.mutate({
      kind: editing,

      // DELETE الحالي لا يحتاج body.
      values: editing === "delete" ? undefined : result.data,
    });
  }

  return (
    <div className="profile-view" dir="rtl">
      <AppNavbar />

      <div className="profile-page">
        <header className="profile-page__heading">
          <h1>حسابي</h1>
          <p>بياناتك وشخصيتك في مكان واحد.</p>
        </header>

        {notice && <InlineMessage type="success" message={notice} />}

        {/* القسم الأول: الشخصية */}
        <section className="profile-card profile-identity" aria-label="الشخصية">
          <div className="profile-identity__person">
            <div className="profile-avatar">
              <img src={avatarSrc} alt="شخصيتك" />

              <button
                type="button"
                className="profile-avatar__edit"
                aria-label="تعديل الشخصية"
                onClick={(event) => open("avatar", event)}
              >
                <Pencil size={15} aria-hidden="true" />
              </button>
            </div>

            <div>
              <h2>{user.name}</h2>
              <bdi dir="ltr">@{user.username}</bdi>
            </div>
          </div>

          <Button variant="outline" onClick={(event) => open("avatar", event)}>
            غيّر الشخصية
          </Button>
        </section>

        {/* القسم الثاني: المعلومات */}
        <section
          className="profile-card profile-info"
          aria-labelledby="profile-info-title"
        >
          <h2 id="profile-info-title">معلوماتي</h2>

          {informationRows.map((field) => (
            <div className="profile-info__row" key={field}>
              <span className="profile-info__label">
                {fields[field] ||
                  (field === "email" ? "الإيميل" : "كلمة المرور")}
              </span>

              <strong>
                <bdi dir={field === "name" ? "rtl" : "ltr"}>
                  {displayValue(field)}
                </bdi>
              </strong>

              {field === "email" ? (
                <span className="profile-info__locked">
                  <LockKeyhole size={13} aria-hidden="true" />
                  ما يتعدّل
                </span>
              ) : (
                <Button
                  variant="outline"
                  aria-label={`${
                    field === "password" ? "تغيير" : "تعديل"
                  } ${fields[field] || "كلمة المرور"}`}
                  onClick={(event) => open(field, event)}
                >
                  <Pencil size={13} aria-hidden="true" />
                  {field === "password" ? "تغيير" : "تعديل"}
                </Button>
              )}
            </div>
          ))}
        </section>

        {/* القسم الثالث: حذف الحساب */}
        <section
          className="profile-card profile-danger"
          aria-labelledby="profile-delete-title"
        >
          <div>
            <h2 id="profile-delete-title">حذف الحساب</h2>
            <p>حذف حسابك نهائي. هذا الإجراء ما يمكن التراجع عنه.</p>
          </div>

          <Button variant="outline" onClick={(event) => open("delete", event)}>
            <Trash2 size={16} aria-hidden="true" />
            احذف حسابي
          </Button>
        </section>
      </div>

      {/* نافذة واحدة يتغير محتواها حسب editing */}
      <Dialog.Root
        open={Boolean(editing)}
        onOpenChange={(isOpen) => {
          if (!isOpen) close();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="profile-dialog-overlay" />

          <Dialog.Content
            className="profile-dialog"
            dir="rtl"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              trigger.current?.focus();
            }}
            onEscapeKeyDown={(event) => {
              if (busy) event.preventDefault();
            }}
            onPointerDownOutside={(event) => {
              if (busy || deleted) {
                event.preventDefault();
              }
            }}
          >
            <button
              type="button"
              className="profile-dialog__close"
              aria-label="إغلاق"
              disabled={busy}
              onClick={close}
            >
              <X size={20} aria-hidden="true" />
            </button>

            {deleted ? (
              /* نافذة نجاح حذف الحساب */
              <div className="profile-deleted">
                <span className="profile-deleted__icon">
                  <Check aria-hidden="true" />
                </span>

                <Dialog.Title>تم حذف حسابك</Dialog.Title>

                <Dialog.Description>
                  نشكرك على وقتك معنا. تقدر تفتح حساب جديد في أي وقت.
                </Dialog.Description>

                <Button fullWidth onClick={close}>
                  رجوع للصفحة الرئيسية
                </Button>
              </div>
            ) : (
              <>
                <Dialog.Title>{titles[editing]}</Dialog.Title>

                <Dialog.Description
                  className={
                    editing === "avatar" || editing === "delete"
                      ? "profile-dialog__description"
                      : "profile-sr-only"
                  }
                >
                  {editing === "avatar"
                    ? "اختر الشخصية اللي تمثلك في الجولات."
                    : editing === "delete"
                      ? "بينحذف حسابك نهائيًا. ما نقدر نرجعه بعدين."
                      : "عدّل بياناتك ثم احفظ التغييرات."}
                </Dialog.Description>

                <form onSubmit={save}>
                  <fieldset disabled={busy} className="profile-dialog__fields">
                    {/* تغيير الشخصية */}
                    {editing === "avatar" && (
                      <CharacterPicker
                        value={draft.avatar_id}
                        onChange={(avatar_id) => setDraft({ avatar_id })}
                      />
                    )}

                    {/* الاسم واسم المستخدم ورقم الجوال */}
                    {fields[editing] && (
                      <AuthField
                        label={fields[editing]}
                        value={draft[editing] || ""}
                        onChange={change(editing)}
                        type={editing === "phone_number" ? "tel" : "text"}
                        inputDir={editing === "username" ? "ltr" : undefined}
                        maxLength={
                          { name: 30, username: 20, phone_number: 9 }[editing]
                        }
                        required
                        autoComplete="off"
                      />
                    )}

                    {/* تغيير كلمة المرور */}
                    {editing === "password" &&
                      passwordFields.map(([key, label]) => (
                        <AuthField
                          key={key}
                          label={label}
                          type="password"
                          value={draft[key]}
                          onChange={change(key)}
                          required
                          autoComplete={
                            key === "old_password"
                              ? "current-password"
                              : "new-password"
                          }
                        />
                      ))}

                    {/* تأكيد حذف الحساب */}
                    {editing === "delete" && (
                      <AuthField
                        label={`اكتب اسم المستخدم ${user.username} للتأكيد`}
                        value={draft.confirmation || ""}
                        onChange={change("confirmation")}
                        inputDir="ltr"
                        placeholder={user.username}
                        autoComplete="off"
                        required
                      />
                    )}
                  </fieldset>

                  {error && <InlineMessage type="error" message={error} />}

                  <div className="profile-dialog__actions">
                    <Button
                      type="submit"
                      loading={busy}
                      className={
                        editing === "delete" ? "profile-delete-confirm" : ""
                      }
                      disabled={
                        editing === "delete" &&
                        draft.confirmation !== user.username
                      }
                    >
                      {editing === "delete"
                        ? "احذف حسابي نهائيًا"
                        : "حفظ التغييرات"}
                    </Button>

                    <Button variant="outline" disabled={busy} onClick={close}>
                      {editing === "delete" ? "تراجع" : "إلغاء"}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
