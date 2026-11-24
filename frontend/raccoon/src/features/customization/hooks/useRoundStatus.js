import { useState } from "react";
import { updateEventStatus } from "../../../shared/api/eventsApi";
import { useTranslation } from "react-i18next";

// تشغيل الجولة وإيقافها. الصفحة تقرّر متى يُسمح (canChangeRoundStatus)، والـhook ينفّذ.
export function useRoundStatus({ eventId, refetch }) {
  const { t } = useTranslation();
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
      setStartError(error.message || t("api.updateRoundFailed"));
    } finally {
      setIsStarting(false);
    }
  }

  return { isStarting, startError, changeStatus };
}
