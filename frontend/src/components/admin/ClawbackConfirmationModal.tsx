"use client";

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export interface ClawbackConfirmationModalProps {
  open: boolean;
  streamId: string;
  amount: string;
  remainingVested: string;
  onPreview: () => void;
  onCancel: () => void;
  /** true while the read-only preview request is in flight. */
  previewing?: boolean;
}

/**
 * Review gate for the read-only clawback preview. Dismissing the modal never
 * sends a request.
 */
export function ClawbackConfirmationModal({
  open,
  streamId,
  amount,
  remainingVested,
  onPreview,
  onCancel,
  previewing = false,
}: ClawbackConfirmationModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <ModalContent mobileFullScreen={false}>
        <ModalHeader>
          <ModalTitle>Preview clawback</ModalTitle>
          <ModalDescription>
            This is a read-only preview. It does not move tokens or change the stream balance.
          </ModalDescription>
        </ModalHeader>

        <ModalBody>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-secondary">Stream ID</dt>
              <dd className="font-medium text-text-primary break-all text-right">{streamId}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-secondary">Requested amount</dt>
              <dd className="font-medium text-text-primary">{amount}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-secondary">Remaining vested</dt>
              <dd className="font-medium text-text-primary">{remainingVested}</dd>
            </div>
          </dl>
        </ModalBody>

        <ModalFooter>
          <Button variant="secondary" onClick={onCancel} disabled={previewing}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onPreview} disabled={previewing}>
            {previewing ? "Loading preview…" : "Run preview"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
