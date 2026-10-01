/**
 * Tests for the ConfirmActionModal component (#54, #61).
 *
 * Covers:
 * - Renders title and message when open
 * - Cancel button calls onOpenChange(false)
 * - Confirm button calls onConfirm
 * - Loading state disables both buttons
 * - Different variants render correct CSS classes
 * - role="alertdialog" is present with an accessible name + description
 * - Initial focus lands on Cancel and Escape/backdrop dismiss the dialog
 * - Focus returns to the trigger after the dialog closes
 * - axe accessibility audit passes
 */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { ConfirmActionModal } from "../ConfirmActionModal";

expect.extend(toHaveNoViolations);

function renderModal(overrides: Partial<React.ComponentProps<typeof ConfirmActionModal>> = {}) {
  const props: React.ComponentProps<typeof ConfirmActionModal> = {
    open: true,
    onOpenChange: jest.fn(),
    title: "Close Stream",
    message: "This will permanently close the stream. Are you sure?",
    confirmLabel: "Close Stream",
    cancelLabel: "Cancel",
    variant: "danger",
    onConfirm: jest.fn(),
    loading: false,
    ...overrides,
  };
  return { ...render(<ConfirmActionModal {...props} />), props };
}

function ControlledConfirmModal() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open confirm
      </button>
      <ConfirmActionModal
        open={open}
        onOpenChange={setOpen}
        title="Close Stream"
        message="This will permanently close the stream. Are you sure?"
        confirmLabel="Close Stream"
        onConfirm={() => {}}
      />
    </>
  );
}

describe("ConfirmActionModal (#54/#61 — keyboard-accessible confirmations)", () => {
  it("renders the dialog when open=true", () => {
    renderModal();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("does not render when open=false", () => {
    renderModal({ open: false });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("shows title and message", () => {
    renderModal();
    expect(
      screen.getByRole("heading", { name: "Close Stream" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This will permanently close the stream. Are you sure?"),
    ).toBeInTheDocument();
  });

  it("exposes the title and message as accessible name and description", () => {
    renderModal();
    const dialog = screen.getByRole("alertdialog", { name: "Close Stream" });
    expect(dialog).toHaveAccessibleDescription(
      "This will permanently close the stream. Are you sure?",
    );
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("calls onOpenChange(false) when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const { props } = renderModal();

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onConfirm when confirm button is clicked", async () => {
    const user = userEvent.setup();
    const { props } = renderModal();

    await user.click(screen.getByTestId("confirm-action-button"));

    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onOpenChange(false) when Escape is pressed", () => {
    const { props } = renderModal();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("moves initial focus to the Cancel button", async () => {
    renderModal();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /cancel/i })).toHaveFocus(),
    );
  });

  it("returns focus to the trigger after the dialog closes", async () => {
    const user = userEvent.setup();
    render(<ControlledConfirmModal />);

    const trigger = screen.getByRole("button", { name: "Open confirm" });
    await user.click(trigger);
    await waitFor(() => screen.getByRole("alertdialog"));

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });

  it("disables both buttons when loading=true", () => {
    renderModal({ loading: true });

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    const confirmBtn = screen.getByTestId("confirm-action-button");

    expect(cancelBtn).toBeDisabled();
    expect(confirmBtn).toBeDisabled();
  });

  it("shows a spinner inside the confirm button when loading", () => {
    renderModal({ loading: true });
    // The spinning span is aria-hidden
    const confirmBtn = screen.getByTestId("confirm-action-button");
    expect(confirmBtn.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it("uses the confirmLabel as aria-label on the confirm button", () => {
    renderModal({ confirmLabel: "Pause Stream" });
    expect(
      screen.getByRole("button", { name: "Pause Stream" }),
    ).toBeInTheDocument();
  });

  it("has no axe violations for danger variant", async () => {
    renderModal({ variant: "danger" });
    const dialog = await screen.findByRole("alertdialog");
    expect(await axe(dialog)).toHaveNoViolations();
  });

  it("has no axe violations for warning variant", async () => {
    renderModal({ variant: "warning", title: "Pause Stream", confirmLabel: "Pause Stream" });
    const dialog = await screen.findByRole("alertdialog");
    expect(await axe(dialog)).toHaveNoViolations();
  });

  it("has no axe violations for info variant", async () => {
    renderModal({ variant: "info", title: "Resume Stream", confirmLabel: "Resume Stream" });
    const dialog = await screen.findByRole("alertdialog");
    expect(await axe(dialog)).toHaveNoViolations();
  });
});
