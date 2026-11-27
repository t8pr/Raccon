import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEventDetails } from "../hooks/useEventDetails";
import ScanResultScreen from "../../journey/screens/ScanResultScreen";
import ScanErrorScreen from "../../journey/screens/ScanErrorScreen";
import { FREEZE_DEFAULT_SECONDS } from "../../../shared/utils/trapRules";
import { PREVIEW_SCREENS } from "./previewScreens";

/*
  شاشة مسح وحدة ببيانات تجريبية، تنفتح داخل الجوال في صفحة المعاينة (iframe).
  ليش iframe؟ شاشات المسح مبنية على طول الشاشة (100dvh) ولوحتها ثابتة (fixed)،
  فداخل iframe بعرض الجوال تطلع بالضبط مثل ما يشوفها اللاعب.

  الرابط: /customization/:eventId/preview/frame?s=found&mode=seq&tag=<tag_id>
  القطعة (?tag=): نعرض محتواها المحفوظ زي ما هو (تلميحها وصورتها ورقمها ومدة تجميدها).
    ما لها تلميح؟ تطلع بطاقة «ما لها تلميح»، نفس اللي يشوفه اللاعب.
  بدون tag: تلميح أول قطعة فيها تلميح في الجولة، وإلا جملة تجريبية.
  ما فيه طلبات للمسح: البيانات كلها هنا، فالمعاينة ما تغيّر شي في الجولة.
*/

// التقدّم في كل الشاشات: 4 قطع من 10 (total_tags ثابت، فنقاط التقدّم ما تتغيّر حتى بعد «بووم»)
const STATS = { current_score: 4, remaining_tags: 6, total_tags: 10 };

export default function ScanPreviewFrame() {
  const { t } = useTranslation();
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const { data: event, isPending } = useEventDetails(eventId);

  const mode = searchParams.get("mode") === "open" ? "open" : "seq";
  const screen = PREVIEW_SCREENS[mode].includes(searchParams.get("s"))
    ? searchParams.get("s")
    : "found";

  const tagId = searchParams.get("tag");
  const tag = tagId
    ? event?.tags?.find((item) => item.tag_id === tagId)
    : undefined;
  const sampleTag = event?.tags?.find(
    (item) =>
      item.tag_type !== "trap" && (item.content?.hint || item.content?.image),
  );
  // القطعة المختارة: محتواها زي ما هو. الفخ ما له تلميح، فبطاقته فاضية مثل ما يشوفها اللاعب
  const hint = tag
    ? { hint: tag.content?.hint ?? "", image: tag.content?.image ?? "" }
    : (sampleTag?.content ?? { hint: t("customization.preview.sampleHint") });
  const tagNumber = tag?.sequence_num ?? 4;
  const freeze = tag?.content?.freeze ?? FREEZE_DEFAULT_SECONDS;

  const shell = { eventTitle: event?.title, mode };
  const result = (extra) => ({
    status: "success",
    mode,
    tag_type: "clue",
    tag_sequence: tagNumber,
    ...STATS,
    content: hint,
    ...extra,
  });
  const error = (extra) => ({ ...STATS, ...extra });
  const trap = (extra) => result({ tag_type: "trap", ...extra });

  // ننتظر بيانات الجولة قبل ما نرسم: وإلا تطلع القطعة الغلط لحظة، وعدّاد التجميد
  // يبدأ بالمدة الافتراضية (60) بدل مدة القطعة وما يتحدّث بعدها
  // (لو فشل الطلب نكمل بالبيانات التجريبية)
  if (isPending) return null;

  switch (screen) {
    case "already":
      return (
        <ScanErrorScreen
          shell={shell}
          scanError={error({ code: "already_scanned", content: hint })}
        />
      );
    case "skipped":
      return (
        <ScanErrorScreen
          shell={shell}
          scanError={error({
            code: "skipped_tag",
            message: `Skipped tag! You must scan tag ${Math.max(tagNumber - 1, 1)} first.`,
          })}
        />
      );
    case "claimed":
      return (
        <ScanErrorScreen
          shell={shell}
          scanError={error({
            code: "claimed_by_another_player",
            message: `Sorry, ${t("customization.preview.sampleName")} claimed this tag before you!`,
          })}
        />
      );
    case "notlive":
      return (
        <ScanErrorScreen
          shell={shell}
          scanError={{ code: "not_live", message: "This event is not live." }}
        />
      );
    case "completed":
      return (
        <ScanErrorScreen
          shell={shell}
          scanError={{
            code: "completed",
            message: "You have already completed this event!",
            total_tags: event?.tags?.length,
            content: hint,
          }}
        />
      );
    case "notyours":
      return (
        <ScanErrorScreen
          shell={shell}
          scanError={{ code: "unknown", message: "Security Violation." }}
        />
      );
    case "choose":
      // زر «ازرع» يطلب من الخادم؛ في المعاينة الجوال كله للعرض بس (الإطار ما يستقبل ضغط)
      return (
        <ScanResultScreen
          shell={shell}
          scanResult={trap({
            status: "choose_required",
            content: { choose: true },
          })}
          choose={{
            key: "preview",
            tagHash: "",
            userHash: "",
            onActivated: () => {},
          }}
        />
      );
    case "planted":
      return (
        <ScanResultScreen
          shell={shell}
          scanResult={trap({
            status: "trap_set",
            content: { was_choose: true, freeze },
          })}
        />
      );
    case "boom":
      return (
        <ScanResultScreen
          shell={shell}
          scanResult={trap({
            status: "trap_triggered",
            current_score: 3,
            content: { boom: 1 },
          })}
        />
      );
    case "frozen":
      return (
        <ScanResultScreen
          shell={shell}
          scanResult={trap({
            status: "trap_triggered",
            frozen_until: new Date(Date.now() + freeze * 1000).toISOString(),
            content: { freeze },
          })}
        />
      );
    case "unfrozen":
      return (
        <ScanErrorScreen
          shell={shell}
          scanError={error({
            code: "freeze",
            frozen_until: new Date(Date.now() - 1000).toISOString(),
          })}
        />
      );
    default:
      return <ScanResultScreen shell={shell} scanResult={result()} />;
  }
}
