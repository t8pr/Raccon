import { ChevronDown } from "lucide-react";

//options: Array of available options ,  value: The current selecter , onChange: The new selecter value of the list
export default function SortButton({ options, value, onChange }) {
  return (
    <label className="sort-button">
      <select
        aria-label="ترتيب الباكجات"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            ترتيب: {option.label}
          </option>
        ))}
      </select>

      <ChevronDown size={16} aria-hidden="true" />
    </label>
  );
}
