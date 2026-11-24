import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { renameEvent } from "../../../shared/api/eventsApi";
import { useAuth } from "../../../shared/auth/AuthContext";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { useTranslation } from "react-i18next";

export const EVENT_NAME_MAX_LENGTH = 20;

/*
  تعديل اسم الجولة من عنوان صفحة التخصيص.
    editing   هل حقل الاسم ظاهر بدل العنوان
    draft     النص داخل الحقل
    error     رسالة الخطأ تحت العنوان
  editButtonRef: زر القلم، يرجع له التركيز بعد الحفظ أو الإلغاء.
*/
export function useEventRename(eventId) {
  const { t } = useTranslation();
  const { accessToken, user } = useAuth();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // يمنع الحفظ المزدوج والإلغاء أثناء الحفظ
  const saveLockRef = useRef(false);
  const editButtonRef = useRef(null);

  function focusEditButton() {
    requestAnimationFrame(() => editButtonRef.current?.focus());
  }

  function start(currentTitle) {
    setDraft(currentTitle || "");
    setError("");
    setEditing(true);
  }

  function cancel() {
    if (saveLockRef.current) return;

    setEditing(false);
    setError("");
    focusEditButton();
  }

  async function save(event) {
    event.preventDefault();

    if (saveLockRef.current) return;

    const title = draft.trim();

    if (!title || title.length > EVENT_NAME_MAX_LENGTH) {
      setError(t("customization.rename.lengthError"));
      return;
    }

    saveLockRef.current = true;
    setSaving(true);
    setError("");

    try {
      const updated = await renameEvent(eventId, title);
      const nextTitle = updated?.title ?? title;
      const eventKey = queryKeys.event(eventId, accessToken);

      await queryClient.cancelQueries({ queryKey: eventKey, exact: true });

      // نغيّر العنوان فقط؛ بيانات القطع والتعديلات غير المحفوظة تبقى كما هي.
      queryClient.setQueryData(eventKey, (current) =>
        current ? { ...current, title: nextTitle } : current,
      );

      queryClient.setQueryData(queryKeys.myEvents(user?.id), (current) =>
        current?.map((item) =>
          String(item.id) === String(eventId)
            ? { ...item, title: nextTitle }
            : item,
        ),
      );

      void queryClient.invalidateQueries({
        queryKey: queryKeys.myEvents(user?.id),
      });

      setEditing(false);
      focusEditButton();
    } catch {
      setError(t("customization.rename.failed"));
    } finally {
      saveLockRef.current = false;
      setSaving(false);
    }
  }

  return {
    editing,
    draft,
    setDraft,
    saving,
    error,
    editButtonRef,
    start,
    cancel,
    save,
  };
}
