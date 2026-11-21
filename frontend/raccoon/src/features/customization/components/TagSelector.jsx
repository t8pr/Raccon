import ClassTag from "./ClassTag";
import TagLegend from "./TagLegend";
import { getTrapType } from "../utils/tagForm";

/*
  قائمة القطع: شريط «القطع الجاهزة»، شبكة القطع، ودليل الألوان.
  children: ما يظهر تحت القائمة (إعدادات الجولة).

  القطعة تظهر «قيد التعديل» إذا كانت هي المختارة، والباقة قابلة للتخصيص،
  وفيها تغييرات غير محفوظة أو لم تُحفظ من قبل.
*/
export default function TagSelector({
  tags,
  selectedTagId,
  configuredCount,
  canCustomize,
  hasChanges,
  disabled,
  onSelect,
  children,
}) {
  return (
    <section className="Tag-Selector">
      <div className="tag-progress__label">
        <span>القطع الجاهزة</span>

        <strong>
          {configuredCount} من {tags.length}
        </strong>
      </div>

      <progress
        className="tag-progress"
        value={configuredCount}
        max={Math.max(tags.length, 1)}
        aria-label="القطع الجاهزة"
      />

      <div className="class-tag-grid">
        {tags.map((tag) => (
          <ClassTag
            key={tag.tag_id}
            number={tag.sequence_num}
            configured={Boolean(tag.is_configured)}
            selected={selectedTagId === tag.tag_id}
            editing={selectedTagId === tag.tag_id && canCustomize}
            staged={Boolean(tag.isStaged)}
            trapType={getTrapType(tag)}
            disabled={disabled}
            onClick={() => onSelect(tag)}
          />
        ))}
      </div>

      <TagLegend />

      {children}
    </section>
  );
}
