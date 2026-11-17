import { useState } from "react";
import { updateEventStatus } from "../../../shared/api/eventsApi";

// تشغيل الجولة وإيقافها. الصفحة تقرّر متى يُسمح (canChangeRoundStatus)، والـhook ينفّذ.
export function useRoundStatus({ eventId, refetch }) {
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState("");

  // nextStatus: "live" للبدء، "paused" للإيقاف
  async function changeStatus(nextStatus) {
    setIsStarting(true);
    setStartError("");

    try {
      await updateEventStatus(eventId, nextStatus);
      await refetch();
    } catch (error) {
      setStartError(error.message || "تعذر تحديث حالة الجولة.");
    } finally {
      setIsStarting(false);
    }
  }

  return { isStarting, startError, changeStatus };
}
