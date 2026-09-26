# ADR-007: On-Chain vs Off-Chain Product Listings

- Status: Accepted
- Date: 2024-01-01
- Deciders: Core team
- Related: `frontend/src/lib/stellar`

## Context

Product listings (what is for sale, by whom, at what price, and with what
metadata) can be represented either fully on-chain or off-chain with on-chain
anchoring. We needed a clear decision on where listing data lives and how the
frontend interacts with it.

The relevant integration lives in `frontend/src/lib/stellar`, which mediates
between the application and the Stellar network.

## Decision

We use a **hybrid model**: listings are stored **off-chain**, while
**ownership, payment, and settlement** are handled **on-chain** via Stellar.

- **Off-chain**: listing content and metadata (titles, descriptions, images,
  categories, mutable attributes) are stored off-chain for flexibility and
  cost efficiency.
- **On-chain**: the economically significant facts — ownership/transfer of
  assets, prices, and payment settlement — are recorded on Stellar through the
  integration in `frontend/src/lib/stellar`.
- The frontend reads listing metadata off-chain and uses the Stellar library to
  perform and verify on-chain operations (e.g. payments, asset transfers).

## Rationale

- **Cost**: storing rich, mutable metadata on-chain is expensive and wasteful;
  off-chain storage keeps listing operations cheap.
- **Flexibility**: off-chain metadata can be edited, localized, and enriched
  without on-chain transactions.
- **Trust where it matters**: ownership and payment are the parts that require
  consensus and immutability, so they are anchored on-chain.
- **Performance**: off-chain reads are fast and cacheable, improving listing
  browse/search UX.
- **Leverages Stellar**: Stellar is well-suited to fast, low-cost value
  transfer and asset issuance, which is exactly the on-chain portion we need.

## Consequences

### Positive

- Low cost and high flexibility for listing content.
- Strong, verifiable guarantees for ownership and payments.
- Clear separation of concerns between the metadata layer and the settlement
  layer.

### Negative / Trade-offs

- **Consistency risk**: off-chain metadata and on-chain state can drift; the
  system must reconcile them (e.g. verify on-chain ownership before honoring a
  listing).
- **Availability dependency**: off-chain storage must remain available; the
  on-chain record alone does not describe the item.
- **More moving parts**: clients must combine off-chain reads with on-chain
  verification, adding integration complexity in `frontend/src/lib/stellar`.

## Alternatives Considered

- **Fully on-chain listings**: maximal verifiability and atomicity, but high
  cost and poor fit for mutable/rich metadata.
- **Fully off-chain listings**: cheapest and simplest, but no trustless
  ownership or settlement guarantees.

## References

- `frontend/src/lib/stellar`
