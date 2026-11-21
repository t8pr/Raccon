import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import ConfirmDialog from "./ConfirmDialog";

function renderDialog(props) {
  const handlers = { onConfirm: vi.fn(), onCancel: vi.fn() };
  render(
    <ConfirmDialog
      open
      title="إيقاف الجولة؟"
      description="اللاعبين ما يقدرون يمسحون."
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

test("مقفلة: ما يظهر شي", () => {
  renderDialog({ open: false });

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("مفتوحة: العنوان والوصف، والتركيز على «إلغاء» (الخيار الآمن)", async () => {
  renderDialog();

  const dialog = screen.getByRole("dialog", { name: "إيقاف الجولة؟" });
  expect(dialog).toHaveAccessibleDescription("اللاعبين ما يقدرون يمسحون.");
  await waitFor(() => expect(screen.getByRole("button", { name: "إلغاء" })).toHaveFocus());
});

test("«نعم» يستدعي onConfirm", async () => {
  const { onConfirm, onCancel } = renderDialog();

  await userEvent.click(screen.getByRole("button", { name: "نعم" }));

  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(onCancel).not.toHaveBeenCalled();
});

test("«إلغاء» يستدعي onCancel", async () => {
  const { onCancel } = renderDialog();

  await userEvent.click(screen.getByRole("button", { name: "إلغاء" }));

  expect(onCancel).toHaveBeenCalled();
});

test("Esc يلغي", async () => {
  const { onCancel, onConfirm } = renderDialog();

  await userEvent.keyboard("{Escape}");

  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onConfirm).not.toHaveBeenCalled();
});
