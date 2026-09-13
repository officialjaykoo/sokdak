# Sokdak deployment

**Status:** Canonical
**Scope:** Cloudflare resources, secrets, deploy and rollback for `sokdak.kr`

## 1. Resources

Configured in `wrangler.jsonc` (worker name `sokdak`):

| Binding | Resource | Notes |
|---|---|---|
| `DB` | D1 `vth-db` (`f25b46db-…`) | Production database carried over from the VTH fork. Contains live user/DM history — do not repoint casually. |
| `MEDIA_BUCKET` | R2 `vth-media` | Media bytes. Same carry-over; renaming requires an R2 data migration. |
| `CHAT_ROOM` | Durable Object `ChatRoom` | Realtime DM delivery only. |
| rate limits | `EDGE_IP_RATE_LIMITER`, `TUNNEL_IP_RATE_LIMITER`, `EXPENSIVE_IP_RATE_LIMITER` | Workers rate-limit bindings. |
| `ASSETS` | `.open-next/assets` | Built by `opennextjs-cloudflare`. |
| `CACHE` | KV (optional) | Falls back to isolate memory if omitted. |

Cron: `0 3 * * *` — orphaned-media cleanup.

Domains: `sokdak.kr` (app), `developers.sokdak.kr` (developer docs host, path-rewritten by the worker). Custom-domain routes are attached in the Cloudflare dashboard, not in `wrangler.jsonc`.

## 2. Variables and secrets

Public vars (in `wrangler.jsonc`): `BETTER_AUTH_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXTJS_ENV`, `KAKAO_CLIENT_ID`.

Secrets (`wrangler secret put`, never committed):

```bash
wrangler secret put BETTER_AUTH_SECRET      # required — sessions + realtime token
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put KAKAO_CLIENT_SECRET     # required if enabled in the Kakao app
wrangler secret put VAPID_PRIVATE_KEY       # web push
wrangler secret put VAPID_SUBJECT
```

Optional vars: `SOKDAK_AUTH_ORIGINS` (extra browser origins for previews), `VAPID_PUBLIC_KEY` (public var, not a secret).

## 3. Deploy

```bash
npm run build:worker   # OpenNext build — catches bundling issues first
npm run deploy         # build + deploy
npx wrangler d1 migrations apply DB --remote   # apply pending D1 migrations
```

Order matters when a release ships a migration: apply the migration to production D1, then deploy the code that depends on it.

See `DATABASE.md` before applying `0002_legacy_scope_cleanup.sql` to production — it drops retired tables and rebuilds `posts`/`comments`. Backup first:

```bash
npx wrangler d1 export DB --remote --output .tmp/sokdak-backup-YYYYMMDD-HHmm.sql
```

## 4. Smoke checks after deploy

- `https://sokdak.kr` renders the feed.
- Login flow reaches Kakao and returns to `sokdak.kr`.
- `https://developers.sokdak.kr` serves the developer docs.
- If `dm_enabled` is on: open a DM room and confirm realtime delivery.

## 5. Rollback

- Code: redeploy the previous Git revision (`npm run deploy` from that checkout) or use Workers version rollback in the dashboard.
- Migrations are forward-only — there is no down migration. Restore from the `d1 export` backup if destructive migration damage occurs.

## 6. Local development

```bash
npm ci
cp .dev.vars.example .dev.vars   # fill in Kakao/Turnstile as needed
npm run db:reset:local           # migrate + seed
npm run dev                      # http://localhost:3000
```

Local seed sets `dm_enabled=true`; production defaults it off via `site_settings`.
