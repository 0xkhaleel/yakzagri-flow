"use client";
import { t as translateCopy } from "@/lib/i18n";


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
  onConfirm: () => void;
  onCancel: () => void;
  /** true while the confirmed clawback request is in flight. */
  confirming?: boolean;
}

/**
 * Confirmation gate for admin clawback submissions (#56). Requires an
 * explicit "Confirm clawback" click before anything is sent — dismissing the
 * modal (Cancel, overlay click, Escape) always routes through `onCancel`,
 * never submits.
 */
export function ClawbackConfirmationModal({
  open,
  streamId,
  amount,
  remainingVested,
  onConfirm,
  onCancel,
  confirming = false,
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
          <ModalTitle>{translateCopy("ui.confirm_clawback_57d9d44")}</ModalTitle>
          <ModalDescription>
            {translateCopy("ui.this_immediately_reduces_the_str_1e72f81")}
          </ModalDescription>
        </ModalHeader>

        <ModalBody>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-secondary">{translateCopy("ui.stream_id_ca9cac7")}</dt>
              <dd className="font-medium text-text-primary break-all text-right">{streamId}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-secondary">{translateCopy("ui.requested_amount_fc34a66")}</dt>
              <dd className="font-medium text-text-primary">{amount}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-secondary">{translateCopy("ui.remaining_vested_b10806c")}</dt>
              <dd className="font-medium text-text-primary">{remainingVested}</dd>
            </div>
          </dl>
        </ModalBody>

        <ModalFooter>
          <Button variant="secondary" onClick={onCancel} disabled={confirming}>
            {translateCopy("common.cancel")}
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={confirming}>
            {confirming ? "Confirming…" : "Confirm clawback"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
