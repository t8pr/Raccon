import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Select } from "radix-ui";
import { ArrowLeft, ArrowRight, Check, LayoutList } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEventDetails } from "../hooks/useEventDetails";
import { getTrapType } from "../utils/tagForm";
import {
  PREVIEW_MODES,
  PREVIEW_SCREENS,
  defaultScreenFor,
} from "./previewScreens";
import "../../../shared/ui/SortButton/SortButton.css";
import "./ScanPreviewPage.css";

/*
  معاينة صفحات السكان: صاحب الجولة يشوف وش بيطلع للاعب لما يمسح القطعة.
    1. فوق: رجوع + العنوان في صف واحد
    2. صف ثاني: زرين للنمط (تسلسلي | صيد مفتوح، الافتراضي = نمط الجولة)
       وجنبهم أيقونة تفتح قائمة الشاشات اللي تناسب النمط (Radix Select، نفس قائمة زر الترتيب)
    3. جوال فيه الشاشة (ScanPreviewFrame داخل iframe)
  النمط والشاشة والقطعة في الرابط (?mode=&s=&tag=)، فالتحديث أو مشاركة الرابط يفتح نفس الشاشة.
  القطعة (tag) = اللي كانت مختارة في صفحة التجهيز: الجوال يعرض تلميحها وصورتها ورقمها،
  ولو هي فخ تفتح المعاينة على شاشة فخّها.

  السرعة: الـ iframe يتحمّل مرة وحدة بس. لما تتغيّر الشاشة ما نغيّر src (هذا يعيد تحميل
  الموقع كامل داخله)، نغيّر رابطه من داخل ونبلّغ الراوتر اللي فيه (popstate)، فيبدّل الشاشة فورًا.
*/
export default function ScanPreviewPage() {
  const { t, i18n } = useTranslation();
  const { eventId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: event } = useEventDetails(eventId);

  const modeParam = searchParams.get("mode");
  const mode = PREVIEW_MODES.includes(modeParam)
    ? modeParam
    : event?.mode === "open"
      ? "open"
      : "seq";
  const screens = PREVIEW_SCREENS[mode];
  const tagId = searchParams.get("tag");
  const tag = event?.tags?.find((item) => item.tag_id === tagId);
  // ما فيه شاشة في الرابط، أو مو موجودة في النمط الجديد (مثل «بووم» في التسلسلي)؟
  // نرجع لأول شاشة تناسب القطعة (شاشة فخّها، أو «حصّلتها»)
  const fallback = defaultScreenFor(getTrapType(tag));
  const screen = screens.includes(searchParams.get("s"))
    ? searchParams.get("s")
    : screens.includes(fallback)
      ? fallback
      : "found";

  const tagQuery = tagId ? `&tag=${encodeURIComponent(tagId)}` : "";
  const frameUrl = `/customization/${eventId}/preview/frame?mode=${mode}&s=${screen}${tagQuery}`;
  const [initialSrc] = useState(frameUrl); // src ما يتغيّر بعد أول تحميل
  const frameRef = useRef(null);
  const frameUrlRef = useRef(frameUrl);
  const loadedRef = useRef(false);
  frameUrlRef.current = frameUrl;

  // يودّي الـ iframe للشاشة الحالية بدون إعادة تحميل (نفس الموقع، فنقدر نوصل لـ history حقه)
  const syncFrame = useCallback(() => {
    const win = frameRef.current?.contentWindow;
    if (!loadedRef.current || !win) return; // لسا يتحمّل: onLoad بيستدعيها
    const url = frameUrlRef.current;
    if (win.location.pathname + win.location.search === url) return;
    win.history.replaceState(null, "", url);
    win.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  useEffect(() => {
    syncFrame();
  }, [frameUrl, syncFrame]);

  const show = (next) =>
    setSearchParams(
      { mode, s: screen, ...(tagId ? { tag: tagId } : {}), ...next },
      { replace: true },
    );
  const BackIcon = i18n.dir() === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <div className="scan-preview">
      <main className="scan-preview__main">
        {/* صف 1: رجوع على جنب والعنوان في نص الصفحة */}
        <header className="scan-preview__head">
          <Link to={`/customization/${eventId}`} className="scan-preview__back">
            <BackIcon size={16} aria-hidden="true" />
            {t("customization.preview.back")}
          </Link>
          <h1>{t("customization.preview.title")}</h1>
        </header>

        {/* صف 2: زرين النمط + أيقونة قائمة الشاشات */}
        <div className="scan-preview__controls">
          <div
            className="scan-preview__modes"
            role="radiogroup"
            aria-label={t("customization.preview.modeLabel")}
          >
            {PREVIEW_MODES.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={mode === id}
                className={`scan-preview__mode scan-preview__mode--${id}`}
                onClick={() => show({ mode: id })}
              >
                {t(`customization.preview.modes.${id}`)}
              </button>
            ))}
          </div>

          {/* الشاشة: أيقونة تفتح قائمة بشاشات النمط المختار */}
          <Select.Root
            dir={i18n.dir()}
            value={screen}
            onValueChange={(s) => show({ s })}
          >
            <Select.Trigger
              className="sort-button scan-preview__select"
              aria-label={`${t("customization.preview.screenLabel")}: ${t(`customization.preview.screens.${screen}`)}`}
              title={t("customization.preview.screenLabel")}
            >
              <LayoutList size={20} aria-hidden="true" />
            </Select.Trigger>

            <Select.Portal>
              <Select.Content
                className="sort-menu"
                position="popper"
                side="bottom"
                align="end"
                sideOffset={8}
                collisionPadding={16}
              >
                <Select.Viewport className="sort-menu__list">
                  {screens.map((id) => (
                    <Select.Item
                      key={id}
                      value={id}
                      className="sort-menu__item"
                    >
                      <Select.ItemText>
                        {t(`customization.preview.screens.${id}`)}
                      </Select.ItemText>
                      <Select.ItemIndicator className="sort-menu__check">
                        <Check size={20} strokeWidth={2.5} aria-hidden="true" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        {/* الجوال: للعرض بس (pointer-events: none في CSS)، فما ينضغط فيه زر يطلب من الخادم */}
        <div className="scan-preview__phone">
          <iframe
            title={t("customization.preview.frameTitle")}
            ref={frameRef}
            src={initialSrc}
            onLoad={() => {
              loadedRef.current = true;
              syncFrame(); // لو اخترت شاشة ثانية وهو لسا يتحمّل
            }}
            tabIndex={-1}
          />
        </div>
      </main>
    </div>
  );
}
