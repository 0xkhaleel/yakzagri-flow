export interface ChallengeResponse {
  challenge: string;
}

export interface VerifyResponse {
  token: string;
}

// Canonical trade model lives in the shared domain schema so API and UI
// shapes cannot drift. See docs/shared-schemas.md.
export type {
  Trade,
  TradeAmount,
  CreateTradeInput,
} from "@/lib/domain-schemas/trade";

import type { Trade, TradeAmount } from "@/lib/domain-schemas/trade";

export type TradeStatus = Trade["status"];
export type TradeMoneyAmount = TradeAmount;

/**
 * API response shape for a trade. Money is expressed as `amountCngn` on the
 * wire; the canonical `Trade` model normalizes it to `amount`. Use
 * `mapTradeResponseToTrade` to cross the boundary.
 */
export interface TradeResponse {
  tradeId: string;
  buyerAddress: string;
  sellerAddress: string;
  amountCngn: TradeMoneyAmount;
  buyerLossBps: number;
  sellerLossBps: number;
  status: TradeStatus;
  createdAt: string;
  updatedAt: string;
  eta?: string;
  carrier?: string;
}

export interface TradeListResponse {
  items: TradeResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TradeStatsResponse {
  totalTrades: number;
  totalVolume: number;
  openTrades: number;
}

export interface TradeHistoryEvent {
  eventType: string;
  timestamp: string;
  actor: string;
  metadata: Record<string, unknown>;
}

export interface TradeHistoryResponse {
  events: TradeHistoryEvent[];
}

export interface EvidenceRecord {
  id: string;
  cid: string;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
}

export interface EvidenceResponse {
  evidence: EvidenceRecord[];
}

export interface CreateTradeRequest {
  sellerAddress: string;
  amountUsdc: TradeMoneyAmount;
  buyerLossBps: number;
  sellerLossBps: number;
}

export interface CreateTradeResponse {
  tradeId: string;
  unsignedXdr: string;
}

/**
 * Explicit transform between the API response shape (`amountCngn`) and the
 * canonical domain `Trade` shape (`amount`). This is the single mapping layer
 * that prevents silent semantic drift between request and response money
 * fields.
 */
export function mapTradeResponseToTrade(response: TradeResponse): Trade {
  return {
    id: response.tradeId,
    buyerAddress: response.buyerAddress,
    sellerAddress: response.sellerAddress,
    amount: response.amountCngn,
    buyerLossBps: response.buyerLossBps,
    sellerLossBps: response.sellerLossBps,
    status: response.status,
    createdAt: response.createdAt,
  };
}

export interface DepositResponse {
  unsignedXdr: string;
}

export interface SubmitManifestRequest {
  driverName: string;
  driverPhone: string;
  driverIdNumber?: string;
  vehicleRegistration: string;
  routeDescription: string;
  expectedDeliveryAt: string;
}

export interface SubmitManifestResponse {
  manifestId: number;
  unsignedXdr: string;
}

export interface PathPaymentQuote {
  source_amount: string;
  source_asset_type: string;
  source_asset_code?: string;
  destination_amount: string;
  destination_asset_type: string;
  destination_asset_code?: string;
  path: unknown[];
}

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
}

export interface SearchResponse {
  trades: SearchResultItem[];
  users: SearchResultItem[];
  contracts: SearchResultItem[];
}

export interface AdminAuditEntry {
  id: number;
  action: string;
  actorAddress: string;
  targetReference: string | null;
  note: string | null;
  createdAt: string;
}

export interface AdminAuditListResponse {
  items: AdminAuditEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type StreamStatus = "ACTIVE" | "SUSPENDED" | "TERMINATED" | "COMPLETED";

/** Derived from claimed vs. totalVested — independent of the stream's lifecycle `status`. */
export type VestingState = "not_started" | "vesting" | "fully_vested";

export interface AdminStreamSummary {
  streamId: string;
  recipient: string;
  status: StreamStatus;
  vestingState: VestingState;
  totalVested: string;
  claimed: string;
  unclaimed: string;
  pendingClawback: string;
  adminTags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminStreamListResponse {
  items: AdminStreamSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StreamClawbackPreviewResponse {
  streamId: string;
  remainingVested: string;
  requestedClawback: string;
  postClawbackBalance: string;
  preview: boolean;
  timestamp: string;
}

export type DisputeStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "CLOSED";

export interface DisputeResponse {
  id: number;
  tradeId: string;
  initiator: string;
  reason: string;
  status: DisputeStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  trade: {
    buyerAddress: string;
    sellerAddress: string;
    amountUsdc: TradeMoneyAmount;
  };
}

export interface DisputeListResponse {
  items: DisputeResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReputationEvent {
  id: string;
  event: string;
  impact: number;
  impactLabel: string;
  timestamp: string;
  type:
    | "trade_completed"
    | "trade_initiated"
    | "dispute_initiated"
    | "dispute_resolved"
    | "dispute_involved"
    | "account_created";
}

export interface ReputationResponse {
  trustScore: number;
  totalTrades: number;
  completedTrades: number;
  disputedTrades: number;
  successRate: number;
  history: ReputationEvent[];
}
