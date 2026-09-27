import { apiConfig } from "../api";

export interface BroadcastResponse {
  hash: string;
}

/**
 * Broadcast a signed transaction XDR to the Stellar RPC via `sendTransaction`.
 */
export async function broadcastTransaction(signedTxXdr: string): Promise<BroadcastResponse> {
  const submitResponse = await fetch(apiConfig.getStellarRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sendTransaction",
      params: { transaction: signedTxXdr },
    }),
  });

  const submitResult = await submitResponse.json().catch(() => null);

  if (!submitResponse.ok || submitResult?.error) {
    const message =
      submitResult?.error?.message ||
      (typeof submitResult?.error === "string" ? submitResult.error : null) ||
      `Transaction submission to Stellar failed with status ${submitResponse.status}`;
    throw new Error(message);
  }

  const hash = submitResult?.result?.hash || submitResult?.result?.txHash || "";
  return { hash };
}
