"use client";
import { t as translateCopy } from "@/lib/i18n";


import { useMemo, useState } from "react";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { ClawbackConfirmationModal } from "./ClawbackConfirmationModal";
import { validateClawbackAmount } from "@/lib/clawbackValidation";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import type { StreamClawbackPreviewResponse } from "@/lib/api";

export interface StreamClawbackFormProps {
  token: string;
  streamId: string;
  /** The stream's current remaining vested (unclaimed) balance, as an integer string. */
  remainingVested: string;
  onPreview?: (result: StreamClawbackPreviewResponse) => void;
}

/**
 * Admin clawback preview amount entry with client-side validation (#57).
 * Errors from the backend preview call
 * (invalid/too-large amount, 403, 500, ...) are surfaced via the shared
 * error-code -> message mapping (#59).
 */
export function StreamClawbackForm({
  token,
  streamId,
  remainingVested,
  onPreview,
}: StreamClawbackFormProps) {
  const [amount, setAmount] = useState("");
  const [touched, setTouched] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<StreamClawbackPreviewResponse | null>(null);

  const { handleError } = useErrorHandler();
  const { addToast } = useToast();

  const validation = useMemo(
    () => validateClawbackAmount(amount, remainingVested),
    [amount, remainingVested],
  );

  const handleReviewClick = () => {
    setTouched(true);
    if (!validation.valid) return;
    setModalOpen(true);
  };

  const handleCancel = () => {
    setModalOpen(false);
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const result = await api.adminStreams.clawbackPreview(token, streamId, amount);
      setPreviewResult(result);
      addToast({
        type: "success",
        title: "Clawback preview ready",
        message: `Post-clawback balance would be ${result.postClawbackBalance}.`,
      });
      setModalOpen(false);
      onPreview?.(result);
    } catch (error) {
      handleError(error);
      setModalOpen(false);
    } finally {
      setPreviewing(false);
    }
  };

  const showError = touched && !validation.valid;

  return (
    <div className="space-y-4">
      <FormField
        label="Clawback amount"
        name="clawback-amount"
        required
        hint={`Remaining vested: ${remainingVested}`}
        error={showError ? (validation.error ?? undefined) : undefined}
      >
        <input
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setTouched(true);
            setPreviewResult(null);
          }}
          onBlur={() => setTouched(true)}
          className="w-full rounded-md border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-gold"
          placeholder="0"
        />
      </FormField>

      <Button variant="primary" onClick={handleReviewClick} disabled={!validation.valid}>
        {translateCopy("ui.review_clawback_043eda9")}
      </Button>

      {previewResult && (
        <div role="status" className="rounded-md border border-border-default bg-bg-elevated p-3 text-sm">
          <p className="font-medium text-text-primary">{translateCopy("ui.read_only_preview")}</p>
          <p className="mt-1 text-text-secondary">
            {translateCopy("ui.projected_vested_balance", { balance: previewResult.postClawbackBalance })}
          </p>
        </div>
      )}

      <ClawbackConfirmationModal
        open={modalOpen}
        streamId={streamId}
        amount={amount}
        remainingVested={remainingVested}
        onPreview={handlePreview}
        onCancel={handleCancel}
        previewing={previewing}
      />
    </div>
  );
}
