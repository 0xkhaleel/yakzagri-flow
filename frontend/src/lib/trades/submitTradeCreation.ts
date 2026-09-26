import { signTransaction } from "@stellar/freighter-api";
import { api, apiConfig } from "@/lib/api";
import type { CreateTradeRequest } from "@/lib/api";

export async function submitTradeCreation(
  token: string,
  payload: CreateTradeRequest,
  options: { idempotencyKey?: string; correlationId?: string },
): Promise<{ tradeId: string; transactionHash: string }> {
  const createResponse = await api.trades.create(token, payload, options);
  const signResult = await signTransaction(createResponse.unsignedXdr, {
    networkPassphrase: apiConfig.getStellarNetworkPassphrase(),
  });

  if (signResult.error !== undefined) {
    throw new Error(signResult.error.message || "Failed to sign transaction");
  }

  const submitResponse = await fetch(apiConfig.getStellarRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sendTransaction",
      params: { transaction: signResult.signedTxXdr },
    }),
  });
  const submitResult = await submitResponse.json().catch(() => null);

  if (!submitResponse.ok || submitResult?.error) {
    throw new Error(
      submitResult?.error?.message || "Transaction submission failed",
    );
  }

  return {
    tradeId: createResponse.tradeId,
    transactionHash: submitResult?.result?.hash || createResponse.tradeId,
  };
}