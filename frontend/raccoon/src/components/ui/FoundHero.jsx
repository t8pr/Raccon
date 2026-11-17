import { Tag } from "lucide-react";

// (?redirect_tag=...). Users coming from the landing page get HeroScanAnimation instead.
export default function FoundHero({
  title = "حصلتها!",
  subtitle = "سجّل دخولك عشان تنحفظ القطعة في رحلتك",
}) {
  return (
    <div className="found-hero" role="img" aria-label={`${title} ${subtitle}`}>
      <div className="found-hero__badge" aria-hidden="true">
        <Tag size={44} strokeWidth={1.75} />
      </div>
      <p className="found-hero__title">{title}</p>
      <p className="found-hero__subtitle">{subtitle}</p>
    </div>
  );
} 
