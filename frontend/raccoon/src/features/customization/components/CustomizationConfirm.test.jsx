import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import CustomizationConfirm from "./CustomizationConfirm";

// زر «حفظ» بدون تعديل: نفس السؤال في المسودة ووضع التعديل، والعنوان بس يختلف
test.each([
  ["draft", "حفظ جميع القطع"],
  ["paused", "حفظ التعديلات"],
])("نافذة الحفظ (%s)", (status, title) => {
  render(
    <CustomizationConfirm
      action="saveAll"
      status={status}
      editsRemaining={3}
      onConfirm={() => {}}
      onCancel={() => {}}
    />,
  );

  const dialog = screen.getByRole("dialog", { name: title });
  expect(dialog).toHaveTextContent("هل ترغب في المتابعة وحفظ التعديلات؟");
  expect(dialog).not.toHaveTextContent("المتبقي");
});
