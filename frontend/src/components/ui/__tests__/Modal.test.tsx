import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "../Modal";

expect.extend(toHaveNoViolations);

function ControlledModal() {
  const [open, setOpen] = React.useState(false);

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <button type="button">Open Modal</button>
      </ModalTrigger>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Test modal</ModalTitle>
          <ModalDescription>Focusable content test</ModalDescription>
        </ModalHeader>
        <ModalBody>
          <input aria-label="Name" />
        </ModalBody>
        <ModalFooter>
          <button type="button">Confirm</button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

describe("Modal", () => {
  it("opens and closes via trigger and close button", async () => {
    const user = userEvent.setup();
    render(<ControlledModal />);

    await user.click(screen.getByRole("button", { name: "Open Modal" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on Escape key", async () => {
    const user = userEvent.setup();
    render(<ControlledModal />);

    await user.click(screen.getByRole("button", { name: "Open Modal" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    render(<ControlledModal />);

    await user.click(screen.getByRole("button", { name: "Open Modal" }));
    const dialog = screen.getByRole("dialog");

    // The overlay is rendered immediately before the dialog content.
    const backdrop = dialog.previousElementSibling as HTMLElement;
    expect(backdrop).toBeTruthy();

    fireEvent.pointerDown(backdrop);
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("returns focus to the trigger after closing", async () => {
    const user = userEvent.setup();
    render(<ControlledModal />);

    const trigger = screen.getByRole("button", { name: "Open Modal" });
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    expect(trigger).toHaveFocus();
  });

  it("keeps Tab focus cycling inside the dialog", async () => {
    const user = userEvent.setup();
    render(<ControlledModal />);

    await user.click(screen.getByRole("button", { name: "Open Modal" }));

    const closeButton = screen.getByRole("button", { name: "Close dialog" });
    const nameInput = screen.getByLabelText("Name");
    const confirmButton = screen.getByRole("button", { name: "Confirm" });

    // Radix moves initial focus to the first focusable element in the dialog.
    await waitFor(() => expect(closeButton).toHaveFocus());

    await user.tab();
    await waitFor(() => expect(nameInput).toHaveFocus());

    await user.tab();
    await waitFor(() => expect(confirmButton).toHaveFocus());

    // Tab from the last element wraps back to the first instead of escaping.
    await user.tab();
    await waitFor(() => expect(closeButton).toHaveFocus());

    // Shift+Tab from the first element wraps back to the last.
    await user.tab({ shift: true });
    await waitFor(() => expect(confirmButton).toHaveFocus());
  });

  it("exposes an accessible name and description", async () => {
    const user = userEvent.setup();
    render(<ControlledModal />);

    await user.click(screen.getByRole("button", { name: "Open Modal" }));

    const dialog = screen.getByRole("dialog", { name: "Test modal" });
    expect(dialog).toHaveAccessibleDescription("Focusable content test");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("has no axe violations while open", async () => {
    const user = userEvent.setup();
    render(<ControlledModal />);

    await user.click(screen.getByRole("button", { name: "Open Modal" }));
    const dialog = await screen.findByRole("dialog");

    expect(await axe(dialog)).toHaveNoViolations();
  });
});
