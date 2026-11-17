import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import Button from "../../components/ui/Button";
import { RenameEvent } from "../../api/events/eventsApi";

export default function EventNameEditor({
  eventId,
  title,
  accessToken,
  userId,
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");
  const [invalid, setInvalid] = useState(false);
  const trigger = useRef(null);
  const lock = useRef(false);
  const displayName =
    !title?.trim() || /^(untitled(?:\s+event)?|بدون اسم)$/i.test(title.trim())
      ? "بدون اسم"
      : title;
  function close() {
    setEditing(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }
  const rename = useMutation({
    mutationFn: (name) => RenameEvent(eventId, accessToken, name),
    retry: false,
    onSuccess: async (updated, name) => {
      const nextTitle = updated?.title ?? name;
      const key = ["event", eventId, accessToken];
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      // Update the name only; preserve tag configuration and unsaved editor fields.
      queryClient.setQueryData(key, (current) =>
        current ? { ...current, title: nextTitle } : current,
      );
      queryClient.setQueryData(["my-events", userId], (current) =>
        current?.map((event) =>
          String(event.id) === String(eventId)
            ? { ...event, title: nextTitle }
            : event,
        ),
      );
      void queryClient.invalidateQueries({ queryKey: ["my-events", userId] });
      setInvalid(false);
      setMessage("تم حفظ اسم التجربة.");
      close();
    },
    onError: (error) => {
      setInvalid(true);
      setMessage(error.message || "تعذر حفظ الاسم. حاول مرة أخرى.");
    },
    onSettled: () => {
      lock.current = false;
    },
  });
  function save(event) {
    event.preventDefault();
    if (lock.current) return;
    const name = draft.trim();
    if (!name || name.length > 20) {
      setInvalid(true);
      setMessage("اكتب اسمًا من حرف إلى 20 حرفًا.");
      return;
    }
    lock.current = true;
    setMessage("");
    setInvalid(false);
    rename.mutate(name);
  }
  return (
    <div className="event-name">
      <div className="event-name__heading">
        <h1>
          <bdi>{displayName}</bdi>
        </h1>
        {!editing && (
          <Button
            ref={trigger}
            variant="outline"
            className="event-name__edit"
            aria-label="تعديل اسم التجربة"
            onClick={() => {
              setDraft(displayName === "بدون اسم" ? "" : title);
              setMessage("");
              setInvalid(false);
              setEditing(true);
            }}
          >
            <Pencil size={18} aria-hidden="true" />
            <span>تعديل الاسم</span>
          </Button>
        )}
      </div>
      {editing && (
        <form
          className="event-name__form"
          onSubmit={save}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !lock.current) {
              event.preventDefault();
              setMessage("");
              close();
            }
          }}
        >
          <label htmlFor="event-name-input">اسم التجربة</label>
          <div className="event-name__controls">
            <input
              id="event-name-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={20}
              autoFocus
              disabled={rename.isPending}
              aria-invalid={invalid}
              aria-describedby="event-name-hint event-name-message"
              dir="auto"
            />
            <Button type="submit" loading={rename.isPending}>
              حفظ الاسم
            </Button>
            <Button
              variant="outline"
              disabled={rename.isPending}
              onClick={() => {
                setMessage("");
                close();
              }}
            >
              إلغاء
            </Button>
          </div>
          <small id="event-name-hint">{draft.length}/20 حرف</small>
        </form>
      )}
      <p
        id="event-name-message"
        className="event-name__message"
        role={invalid ? "alert" : "status"}
      >
        {message}
      </p>
    </div>
  );
}
