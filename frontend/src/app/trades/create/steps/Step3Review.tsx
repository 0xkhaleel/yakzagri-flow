import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTradeStore } from '../../../../stores/tradeStore';
import { useOfflineQueueStore } from '../../../../stores/offlineQueueStore';
import { generateCorrelationId } from '../../../../lib/correlationId';
import { apiClient } from '../../../../lib/apiClient';
import { formatCurrency } from '../../../../lib/format';
import type { TradeDraft } from '../../../../types/trade';

interface Step3ReviewProps {
  draft: TradeDraft;
  onBack: () => void;
}

export function Step3Review({ draft, onBack }: Step3ReviewProps) {
  const navigate = useNavigate();
  const submitTrade = useTradeStore((s) => s.submitTrade);
  const enqueue = useOfflineQueueStore((s) => s.enqueue);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    const correlationId = generateCorrelationId();

    try {
      const result = await submitTrade(draft, correlationId);
      navigate(`/trades/${result.id}`);
    } catch (err) {
      if (!navigator.onLine) {
        enqueue({ draft, correlationId });
        navigate('/trades/queue');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to submit trade');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="step-review">
      <h2>Review Trade</h2>

      <dl className="review-summary">
        <div>
          <dt>Asset</dt>
          <dd>{draft.asset}</dd>
        </div>
        <div>
          <dt>Side</dt>
          <dd>{draft.side}</dd>
        </div>
        <div>
          <dt>Amount</dt>
          <dd>{formatCurrency(draft.amount)}</dd>
        </div>
        <div>
          <dt>Counterparty</dt>
          <dd>{draft.counterparty}</dd>
        </div>
      </dl>

      {error && <p className="error">{error}</p>}

      <div className="step-actions">
        <button type="button" onClick={onBack} disabled={submitting}>
          Back
        </button>
        <button type="button" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Confirm Trade'}
        </button>
      </div>
    </div>
  );
}
