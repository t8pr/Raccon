export default function TagLegend() {
  return (
    <div className="tag-legend" aria-label="دليل حالات القطع">
      <span>
        <i
          className="tag-legend__dot tag-legend__dot--saved"
          aria-hidden="true"
        />
        جاهزة
      </span>

      <span>
        <i
          className="tag-legend__dot tag-legend__dot--current"
          aria-hidden="true"
        />
        الحالية
      </span>

      <span>
        <i
          className="tag-legend__dot tag-legend__dot--empty"
          aria-hidden="true"
        />
        غير محفوظة
      </span>

      <span>
        <i
          className="tag-legend__dot tag-legend__dot--trap"
          aria-hidden="true"
        />
        فيها فخ
      </span>
    </div>
  );
}
