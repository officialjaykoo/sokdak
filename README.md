# 속닥속닥 (Sokdak)

속닥속닥 is a small anonymous community for Korean speakers — a single shared feed of independent posts, comments, and optional 1:1 messages.

Production: [sokdak.kr](https://sokdak.kr)
Developer host: [developers.sokdak.kr](https://developers.sokdak.kr)

Sokdak is a fork of [`koval01/red`](https://github.com/koval01/red) (MIT License), substantially reworked into this product: the broader VTH feature set — communities, Q&A, marketplace, businesses, follows/friends, achievements, monetization, and translation — was removed to keep a single anonymous community. Sokdak is independent and is not affiliated with Meta, Kakao, Reddit, or Cloudflare.

## Core product

- Independent posts on a shared feed (latest / popular)
- Nested comments and likes
- Save, hide, report, block, mute
- Notifications and browser push
- Moderation and admin tooling
- Media uploads
- 1:1 messaging (code retained, gated by `site_settings.dm_enabled`)
- Kakao social sign-in
- Korean (default) and English UI

## Architecture

```text
Next.js UI
    |
Sokdak Worker
    |
    +-- D1          canonical persistent state
    +-- R2          media
    +-- ChatRoom DO realtime DM delivery only
    +-- Web Push    optional notification delivery
```

- D1 is the source of truth for users, content, notifications, and messages.
- R2 stores uploaded media; media metadata and authorization remain application state.
- The ChatRoom Durable Object delivers realtime DM events only — it does not persist chat history.
- Browser application requests use `/i/api`; direct `/api/*` requests use the public API bearer-key boundary.
- Feature flags live in `site_settings` (`dm_enabled`, `registration_open`, rate quotas).

## Repository layout

```text
src/app/          Next.js pages and API handlers
src/components/   shared and feature UI
src/lib/          application, identity, auth, security, and data logic
src/worker.ts     Cloudflare Worker entry point
migrations/       D1 schema (0001 baseline + 0002 legacy cleanup)
docs/             active architecture and operations documentation
public/           static assets and service worker
tests/            unit, workers, integration, and Playwright suites
```

## Local development

Requirements: Node.js 22+ and npm.

```bash
git clone https://github.com/officialjaykoo/sokdak.git
cd sokdak
npm ci
cp .dev.vars.example .dev.vars
npm run db:reset:local
npm run dev
```

Open `http://localhost:3000`. Kakao sign-in requires `KAKAO_CLIENT_ID` (and `KAKAO_CLIENT_SECRET` if enabled in the Kakao app) in `.dev.vars`. Never copy production credentials or resource identifiers into another deployment.

## Commands

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e:chromium
npm run build
npm run build:worker
npm run preview
```

For local database work use `npm run db:migrate:local`, `npm run db:seed:local`, or `npm run db:reset:local`. Deploy with `npm run deploy` only after reviewing [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Documentation

- [`docs/PRODUCT.md`](docs/PRODUCT.md) — feature scope and product rules
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — runtime boundaries and invariants
- [`docs/DATABASE.md`](docs/DATABASE.md) — schema and migration policy
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — resources, secrets, deploy, rollback
- [`docs/TESTING.md`](docs/TESTING.md) — test layers and requirements
- [`docs/README.md`](docs/README.md) — documentation index
- [`SECURITY.md`](SECURITY.md) — security policy and reporting

## Security and contribution

Never commit secrets. Production secrets belong in Cloudflare Worker secrets; see [`SECURITY.md`](SECURITY.md).

Prefer small, focused changes. Changes to identity, block/mute, messaging, or moderation must cover complete state transitions, including retries and concurrent requests.

## Fork and attribution

This repository is a fork of [`koval01/red`](https://github.com/koval01/red), originally released under the MIT License. The applicable upstream MIT copyright notice is retained alongside Sokdak's own modifications and documentation.

## License

MIT License. See [`LICENSE`](LICENSE).
