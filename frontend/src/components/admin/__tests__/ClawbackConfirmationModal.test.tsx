import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClawbackConfirmationModal } from "../ClawbackConfirmationModal";

describe("ClawbackConfirmationModal", () => {
  it("is not rendered when closed", () => {
    render(
      <ClawbackConfirmationModal
        open={false}
        streamId="stream-abc-123"
        amount="3000"
        remainingVested="7500"
        onPreview={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("displays the stream id, requested amount, and remaining vested amount", () => {
    render(
      <ClawbackConfirmationModal
        open
        streamId="stream-abc-123"
        amount="3000"
        remainingVested="7500"
        onPreview={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("stream-abc-123")).toBeInTheDocument();
    expect(screen.getByText("3000")).toBeInTheDocument();
    expect(screen.getByText("7500")).toBeInTheDocument();
  });

  it("calls onPreview only after the Run preview button is clicked", async () => {
    const user = userEvent.setup();
    const onPreview = jest.fn();

    render(
      <ClawbackConfirmationModal
        open
        streamId="stream-abc-123"
        amount="3000"
        remainingVested="7500"
        onPreview={onPreview}
        onCancel={jest.fn()}
      />,
    );

    expect(onPreview).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /run preview/i }));
    expect(onPreview).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when Cancel is clicked, without calling onConfirm", async () => {
    const user = userEvent.setup();
    const onPreview = jest.fn();
    const onCancel = jest.fn();

    render(
      <ClawbackConfirmationModal
        open
        streamId="stream-abc-123"
        amount="3000"
        remainingVested="7500"
        onPreview={onPreview}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onPreview).not.toHaveBeenCalled();
  });

  it("calls onCancel (not onConfirm) when dismissed via Escape", () => {
    const onPreview = jest.fn();
    const onCancel = jest.fn();

    render(
      <ClawbackConfirmationModal
        open
        streamId="stream-abc-123"
        amount="3000"
        remainingVested="7500"
        onPreview={onPreview}
        onCancel={onCancel}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onPreview).not.toHaveBeenCalled();
  });

  it("disables both buttons while confirming", () => {
    render(
      <ClawbackConfirmationModal
        open
        streamId="stream-abc-123"
        amount="3000"
        remainingVested="7500"
        onPreview={jest.fn()}
        onCancel={jest.fn()}
        previewing
      />,
    );

    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /loading preview/i })).toBeDisabled();
  });
});
