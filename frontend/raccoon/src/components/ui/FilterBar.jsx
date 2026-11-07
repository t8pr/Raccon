export default function FilterBar({
  filters,
  value,
  onChange,
  sort,
  label = "نوع الباكج",
}) {
  //Filter: list of options, value: selecter vlaue one of [All, openHunt, Sequential], onChange: the new selecter value, sort: react element we can pass throw it SortButton
  return (
    <div className="filter-bar">
      <div className="filter-bar__options" role="group" aria-label={label}>
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className="filter-bar__button"
            aria-pressed={value === filter.value} // aria-pressed: check if the button is select or not
            onClick={() => onChange(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {sort}
    </div>
  );
}
