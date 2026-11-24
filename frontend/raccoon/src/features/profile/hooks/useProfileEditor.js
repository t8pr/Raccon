import { startTransition, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import { useAuth } from "../../../shared/auth/AuthContext";
import { updateProfile } from "../../../shared/api/usersApi";
import { changePassword, deleteAccount } from "../../../shared/api/authApi";
import {
  getProfileSchema,
  validateForm,
} from "../../../shared/utils/validation";
import { getInitialDraft, getRequestErrorMessage } from "../profileFields";
import { useTranslation } from "react-i18next";

/*
  نافذة التعديل الوحيدة في صفحة الحساب.

  editing  أي تعديل مفتوح: null | "avatar" | "name" | "username" | "phone_number" | "password" | "delete"
  draft    القيم المكتوبة في النافذة
  deleted  الحساب انحذف: النافذة تعرض رسالة النجاح، وإغلاقها يخرج المستخدم
*/
export function useProfileEditor() {
  const { t } = useTranslation();
  const { user, updateUser, clearSession, markAccountDeleted } = useAuth();
  const navigate = useNavigate();

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
        return deleteAccount();
      }

      if (kind === "password") {
        return changePassword(values);
      }

      return updateProfile(values);
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
        setNotice(t("profile.notice.passwordChanged"));
      } else {
        // تحديث كاش الحساب من استجابة الباك إند.
        // البروفايل والنافبار يقرآن نفس بيانات المستخدم.
        await updateUser(result);

        setNotice(t("profile.notice.saved"));
      }

      setEditing(null);
      setDraft({});
    },

    onError: (requestError, variables) => {
      setError(getRequestErrorMessage(requestError, variables.kind));
    },

    onSettled: () => {
      pending.current = false;

      // الرسائل محفوظة في error وnotice.
      // لا نحتاج الاحتفاظ بمتغيرات العملية بعد انتهائها.
      profileMutation.reset();
    },
  });

  const busy = profileMutation.isPending;

  // event: ضغطة الزر، حتى يرجع التركيز إليه بعد الإغلاق
  function open(field, event) {
    if (pending.current || busy) return;

    trigger.current = event.currentTarget;

    setDraft(getInitialDraft(field, user));
    setError("");
    setNotice("");
    setEditing(field);
  }

  function close() {
    if (pending.current || busy) return;

    if (deleted) {
      startTransition(() => {
        clearSession();
        navigate("/", { replace: true });
      });
    }

    setEditing(null);
    setDraft({});
    setError("");
  }

  // يرجّع onChange لحقل واحد في draft
  function change(key) {
    return (event) => {
      setDraft((previous) => ({
        ...previous,
        [key]: event.target.value,
      }));
    };
  }

  function setAvatar(avatar_id) {
    setDraft({ avatar_id });
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
      setError(Object.values(result.errors)[0] || t("profile.checkInput"));
      return;
    }

    pending.current = true;

    profileMutation.mutate({
      kind: editing,

      // DELETE الحالي لا يحتاج body.
      values: editing === "delete" ? undefined : result.data,
    });
  }

  return {
    user,
    editing,
    draft,
    error,
    notice,
    deleted,
    busy,
    trigger,
    open,
    close,
    change,
    setAvatar,
    save,
  };
}
