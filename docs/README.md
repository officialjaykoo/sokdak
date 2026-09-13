# Sokdak documentation

Active documentation for **속닥속닥 (Sokdak)** — a small anonymous Korean community service running on Cloudflare Workers, D1, R2, and a single Durable Object for realtime DM delivery.

## Canonical documents

1. [`PRODUCT.md`](PRODUCT.md) — what Sokdak is, who it serves, feature scope, and non-goals.
2. [`ARCHITECTURE.md`](ARCHITECTURE.md) — runtime boundaries, state ownership, identity, security, and invariants.
3. [`DATABASE.md`](DATABASE.md) — D1 schema overview, migration policy, and the baseline-squash layout.
4. [`TESTING.md`](TESTING.md) — test layers, commands, and verification requirements.
5. [`DEPLOYMENT.md`](DEPLOYMENT.md) — Cloudflare resources, secrets, deployment, and rollback.

If a feature document conflicts with one of these, fix the conflict rather than maintaining two truths.

## Historical documents

- [`Phase0.md`](Phase0.md) — the original Phase 0 plan that scoped the Sokdak fork. Some decisions recorded there (boards, multiple OAuth providers) were narrowed during implementation; the code and the canonical documents above are authoritative for current behavior.

## Operations

- [`USER_ID_REKEY_RUNBOOK.md`](USER_ID_REKEY_RUNBOOK.md) — dangerous user-ID rekey procedure. Do not execute without a maintenance window, backup, dry run, and explicit production confirmation.
- [`../SECURITY.md`](../SECURITY.md) — vulnerability reporting and security policy.

## Update discipline

Update documentation when a code change affects any of:

- product scope or non-goals
- persistent data ownership or schema
- identity, block, mute, or moderation semantics
- feed behavior or feature flags (`site_settings`)
- DM authority, recovery, or realtime behavior
- quality and CI requirements
- production deployment, secrets, or bindings

## Before a major change

Read at minimum `PRODUCT.md`, `ARCHITECTURE.md`, `DATABASE.md`, and `TESTING.md`, then the runbook for the operation being performed.
