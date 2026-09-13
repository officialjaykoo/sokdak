# Sokdak testing contract

**Status:** Canonical

## 1. Test layers

| Layer | Config | Location | Purpose |
|---|---|---|---|
| Unit | `vitest.config.mts` | `tests/unit` | pure logic: auth, settings, payloads, rate limits, cursor pagination |
| Worker / integration | `vitest.workers.config.mts` | `tests/workers`, `tests/integration` | API routes against real D1 migrations in a Workers pool |
| E2E | `playwright.config.ts` | `tests/e2e` | browser journeys (Chromium default) |

The Workers/integration suite builds a D1 database from `migrations/` — keep the migration directory consistent or tests fail before a single assertion.

Test Worker bindings live in `wrangler.test.jsonc` (`sokdak-test` D1, `sokdak-test-media` R2, `BETTER_AUTH_SECRET: "test-secret"`).

## 2. Commands

```bash
npm run lint                # eslint
npm run typecheck           # tsc --noEmit
npm run test:unit           # vitest unit suite
npm run test:workers        # vitest workers pool (worker + integration)
npm run test:integration    # integration only
npm test                    # unit + workers
npm run check               # lint + typecheck + test
npm run test:e2e:chromium   # Playwright, Chromium project
npm run build:worker        # OpenNext Worker bundle — required for Worker/binding/migration changes
```

## 3. Requirements

For normal code changes run the relevant tests.

For broad/core changes run `npm run check` plus relevant Playwright tests.

For Worker, bindings, Durable Objects, migrations, deployment, or OpenNext changes also run `npm run build:worker`.

Do not report a command as passing unless it was actually executed.

## 4. Anti-flake and DB integrity

- E2E tests rely on seeded users/sessions from `tests/e2e/helpers`; do not depend on wall-clock ordering where `created_at` ties are possible — assert on stable state.
- `dismissLanguagePrompt()` is a retained no-op helper (the Vietnamese locale was removed); new tests do not need it.
- Migration changes must be validated against a scratch SQLite database: apply all migrations, apply `seed.sql`, then `PRAGMA foreign_key_check` must return zero rows.
- `npm run db:audit:local` runs the strict integrity audit against local D1.
