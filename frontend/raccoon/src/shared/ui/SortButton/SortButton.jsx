import { Select } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import "./SortButton.css";
import { useTranslation } from "react-i18next";

/*
  زر الترتيب (Figma: components-final · 04 · Sort / Dropdown).
  Radix Select بدل <select> المتصفح: نفس القائمة على اللابتوب والجوال، تنفتح تحت الزر
  ومحاذاة يمين (RTL)، وتنقلب فوق إذا ما فيه مكان. الكيبورد وقارئ الشاشة من Radix.

  options: [{ value, label }]   value: الخيار الحالي   onChange(value): الخيار الجديد
  label: اسم الزر لقارئ الشاشة
*/
export default function SortButton({
  options,
  value,
  onChange,
  label,
}) {
  const { t, i18n } = useTranslation();
  label = label ?? t("common.sortPackages");
  const current = options.find((option) => option.value === value);

  return (
    <Select.Root dir={i18n.dir()} value={value} onValueChange={onChange}>
      <Select.Trigger className="sort-button" aria-label={label}>
        <Select.Value>{t("common.sortBy", { label: current?.label })}</Select.Value>
        <Select.Icon className="sort-button__icon">
          <ChevronDown size={20} aria-hidden="true" />
        </Select.Icon>
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
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="sort-menu__item"
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="sort-menu__check">
                  <Check size={20} strokeWidth={2.5} aria-hidden="true" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
