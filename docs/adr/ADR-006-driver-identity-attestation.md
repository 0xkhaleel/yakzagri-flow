# ADR-006: Driver Identity and Attestation Model

- **Status:** Accepted
- **Date:** 2024-01-01
- **Deciders:** Core team
- **Related:** `frontend/src/components/ui/DriverManifestForm.tsx`, `frontend/src/lib/stellar`

## Context

Drivers on the platform must be able to prove who they are and that they are
authorized to operate, without the platform acting as a trusted central
identity provider. We need a model that:

- Lets a driver bind a real-world identity to a Stellar account they control.
- Produces a verifiable, tamper-evident record that other parties (shippers,
  the platform, auditors) can check independently.
- Keeps personally identifiable information (PII) off the public ledger.
- Fits the existing client stack, where drivers submit their details through
  `DriverManifestForm` and signing/verification happens in `frontend/src/lib/stellar`.

Two broad options were considered:

1. **Centralized identity** — the platform stores driver records in its own
   database and issues opaque session credentials. Simple, but requires trusting
   the platform and does not give third parties a portable proof.
2. **Self-sovereign attestation** — the driver signs a manifest with their
   Stellar keypair; the manifest hash is anchored on-chain while the manifest
   contents (including PII) stay off-chain.

## Decision

We adopt the **self-sovereign attestation** model.

- A driver fills out `DriverManifestForm`, which captures the identity fields
  required for attestation (name, license/credential references, contact
  details, and the driver's Stellar public key).
- The form serializes the manifest deterministically and the driver signs it
  with their Stellar secret key via the helpers in `frontend/src/lib/stellar`.
- Only the **hash of the signed manifest** (and the driver's public key) is
  written on-chain. The full manifest, including PII, is stored off-chain and
  referenced by that hash.
- Verification is stateless: any party can recompute the manifest hash, confirm
  it matches the on-chain anchor, and validate the signature against the
  driver's public key.

## Rationale

- **Portable proof.** The attestation is bound to a Stellar keypair, so it can
  be verified by anyone without calling back into the platform.
- **Privacy by construction.** PII never touches the ledger; only a hash is
  anchored, which is not reversible to the underlying data.
- **Tamper evidence.** Any change to the manifest changes its hash, so a
  mismatch with the on-chain anchor is immediately detectable.
- **Reuses existing stack.** Signing and verification already live in
  `frontend/src/lib/stellar`, and the driver-facing flow already exists in
  `DriverManifestForm`, so no new identity infrastructure is required.

## Consequences

### Positive

- Third parties can verify driver identity claims independently.
- The platform is not a single point of trust for identity.
- PII exposure is limited to off-chain storage, which can be governed by
  standard data-protection controls.

### Negative / Trade-offs

- **Key management is the driver's responsibility.** Loss of the Stellar
  secret key means loss of the ability to update or re-sign the attestation;
  recovery must be handled out-of-band.
- **Off-chain availability matters.** Because only the hash is on-chain, the
  full manifest must remain retrievable off-chain for verification to be
  meaningful.
- **Revocation is not automatic.** Revoking or rotating an attestation requires
  publishing a new anchor; consumers must check for the latest valid record.
- **UX cost.** Drivers must understand and manage a keypair, which adds
  onboarding friction compared to a purely centralized login.

## Alternatives Considered

- **Centralized identity store** — rejected because it reintroduces a trusted
  intermediary and does not yield a portable proof.
- **Full manifest on-chain** — rejected because it would publish PII to a
  public, immutable ledger.
