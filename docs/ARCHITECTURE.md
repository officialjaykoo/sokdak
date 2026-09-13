# Sokdak architecture contract

**Status:** Canonical
**Scope:** deployed system boundaries, state ownership, security, and engineering invariants

## 1. System boundary

속닥속닥 is a small anonymous community. The architecture stays small enough for one person to understand end-to-end.

```text
Browser
   |
Cloudflare Worker (src/worker.ts)      edge gate: IP rate limits, bot checks,
   |                                   developer-host routing, DM websocket auth
   |
Next.js / OpenNext handler
   |
   +-- D1                 canonical persistent state (30 tables)
   +-- R2                 media bytes
   +-- ChatRoom DO        realtime DM delivery only (no persistence)
   +-- Web Push           optional notification delivery
```

There is no second canonical application database, no queue, no cache dependency. An optional `CACHE` KV namespace may hold short-lived snapshots (site settings, banned words) but is never authoritative.

## 2. Core rules

1. D1 is authoritative for persistent application state.
2. `user.id` is the immutable internal identity; `username` is a mutable public handle.
3. Canonical writes commit before best-effort realtime, push, or notification side effects.
4. Client state is a projection; it must converge to server truth.
5. Authorization is enforced at the server/final D1 write boundary.
6. Retries must not duplicate canonical rows or user-visible side effects (`request_id` idempotency keys on posts/comments).
7. Applied migrations are immutable; repairs use new forward migrations.
8. One responsibility, one canonical implementation path.

## 3. Request and ingress boundaries

`src/worker.ts` is the first application boundary:

- **IP rate limits** — three Workers rate-limit bindings: `EDGE_IP_RATE_LIMITER` (global flood gate), `TUNNEL_IP_RATE_LIMITER` (`/i/api`), `EXPENSIVE_IP_RATE_LIMITER` (search / security challenge).
- **Developer host** — requests to `developers.sokdak.kr` are path-rewritten to `/developers/*`.
- **`/api/messages/realtime`** — WebSocket upgrade endpoint. The Worker verifies the Better Auth session, rejects banned users, then forwards to the `ChatRoom` Durable Object with `X-Sokdak-User-ID` and `X-Sokdak-Realtime-Token` headers.
- Everything else falls through to the OpenNext handler.
- A daily cron (`0 3 * * *`) runs `cleanupUnreferencedMedia` to delete orphaned R2 objects.

Browser application API traffic uses `/i/api`. Direct `/api/*` requests keep the existing public API authentication boundary (`Authorization: Bearer <api_key>` where required).

Inside the app, layered defenses are complementary:

- edge/IP rate limiting (above)
- Turnstile / bot checks on sensitive routes
- Better Auth session verification
- per-user rate limiting via `security_rate_events` + `site_settings` quotas
- route-level authorization on every mutation

## 4. Identity and authentication

Better Auth owns authentication and session state (`account`, `session`, `verification` tables).

- Active provider: **Kakao** only.
- Social-first/social-only: there is no user-facing email/password flow.
- Two providers exposing the same email do not imply the same user; provider linking follows explicit account policy.
- Legacy `vth_user_*` username prefixes remain recognized for carried-over accounts.
- Every user-owned foreign key uses `user.id`.

## 5. Content and feed

- Posts are independent rows — no `subreddit_id`, no board relationship.
- Public feed ordering uses `is_removed`/`is_shadow_hidden` visibility plus engagement rank (`like_count + comment_count * 3`) or latest ordering.
- Personal visibility layers: `hidden_posts` (self), `user_mutes` (author muting), `user_blocks` (two-way contact/content suppression).
- Comments are a parent-linked tree with `depth`, soft delete (`is_deleted`), and moderation flags.

## 6. Messaging

- D1 stores rooms, membership, requests, messages, and reports — history is recoverable from D1 alone.
- The `ChatRoom` Durable Object is realtime delivery only; it does not persist chat history.
- Message requests gate first contact (`chat_requests`); acceptance promotes to a direct room. `pair_key` deduplicates 1:1 rooms.
- Block revokes contact permission regardless of room state.
- Ordering and read boundaries use `(created_at, id)`.
- User-facing DM access is gated by `site_settings.dm_enabled`; the code path and data are retained regardless.

## 7. Moderation and safety

- `reports` — polymorphic post/comment/user reports.
- `moderation_actions`, `user_warnings` — admin/mod audit trail.
- `banned_words` — content filter list managed in admin.
- `shadowbanned` user status + `is_shadow_hidden` content flags — silent suppression.
- `site_settings` — runtime feature flags and quotas (see `src/lib/site-setting-definitions.ts`).

## 8. Media

- Bytes live in R2 (`MEDIA_BUCKET`); `media_objects` tracks `media_key → uploaded_by` ownership.
- Authorization for reads stays in application state; the bucket is not public.
- The scheduled cleanup deletes objects no longer referenced by content.

## 9. Do not add

PostObject, Vectorize, Redis, Kafka, generic queues, graph databases, microservices, general-purpose Durable Objects, or separate feed/recommendation infrastructure — unless a concrete approved requirement cannot be satisfied by the current architecture.
