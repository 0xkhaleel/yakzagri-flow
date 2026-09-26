# Security Scanning

This document describes the security scanning processes used in this repository,
including the audit workflow, the waiver policy, secret scanning, container
scanning, and SBOM generation.

## Audit workflow

The dependency audit runs via the `security-audit` GitHub Actions workflow. It
runs `npm audit` (or the equivalent package manager audit) against the locked
dependency tree and fails the build when vulnerabilities at or above the
configured severity threshold are found.

When the audit fails, the failure is reported in the workflow summary. To
resolve it you can either upgrade/patch the affected dependency, or — when no
fix is available yet — record a time-boxed waiver as described below.

## Waivers

Waivers live in [`.github/audit-waivers.json`](../.github/audit-waivers.json).
Each entry acknowledges a known advisory so the audit can pass while a fix is
pending. The `_comment` key at the top of that file documents the format and
intent of the file.

A waiver entry must include:

- the advisory identifier (e.g. the GHSA / CVE id),
- the package it applies to,
- a justification explaining why the risk is accepted,
- an **expiry date**.

### Expiry rules

- Every waiver **must** have an expiry date. Waivers without an expiry are
  invalid.
- Expiry dates must be in the future. An expired waiver no longer suppresses the
  finding and the audit will fail again.
- Waivers are intentionally short-lived. When a waiver is close to expiring,
  either land the fix or renew the waiver with an updated justification.
- `scripts/check-audit-waivers.mjs` validates the waiver file: it checks the
  format, ensures each entry has an expiry, and rejects expired waivers. See
  that script for the exact validation logic.

## Secret scanning (gitleaks)

Secret scanning runs via the `secrets-scan` workflow using
[gitleaks](https://github.com/gitleaks/gitleaks). Configuration and allowlists
live in [`.gitleaks.toml`](../.gitleaks.toml).

If gitleaks reports a finding:

- If it is a real secret, **rotate the credential immediately** and remove it
  from history; do not simply add an allowlist entry.
- If it is a false positive, add a narrowly scoped allowlist entry in
  `.gitleaks.toml` with a comment explaining why.

## Container scanning (trivy)

Container images are scanned with [trivy](https://github.com/aquasecurity/trivy)
for OS and language package vulnerabilities. Findings at or above the configured
severity threshold fail the scan. As with the dependency audit, fix the issue or
record a time-boxed waiver where a fix is not yet available.

## SBOM

A Software Bill of Materials (SBOM) is generated for releases so consumers can
track the components shipped in each artifact. The SBOM is produced from the
locked dependency tree and attached to the release artifacts.

## References

- `scripts/check-audit-waivers.mjs` — waiver validation
- `.github/audit-waivers.json` — waiver entries
- `.gitleaks.toml` — secret scanning configuration
