# Sokdak database contract

**Status:** Canonical
**Scope:** D1 schema ownership, migration layout, and integrity rules

## 1. Schema overview

D1 is the single source of truth. The current schema has 30 tables:

| Group | Tables |
|---|---|
| Identity / auth | `user`, `account`, `session`, `verification`, `username_history`, `api_keys` |
| Content | `posts`, `comments`, `post_likes`, `comment_likes`, `post_saves`, `hidden_posts` |
| Relationships / safety | `user_blocks`, `user_mutes`, `reports`, `moderation_actions`, `user_warnings`, `banned_words` |
| Notifications | `notifications`, `unread_fanout`, `push_subscriptions` |
| Messaging (retained, flag-gated) | `chat_rooms`, `chat_room_members`, `chat_requests`, `chat_messages`, `chat_room_reports`, `chat_message_reports` |
| Media | `media_objects` |
| System | `site_settings`, `security_rate_events` |

Key invariants:

- `posts` has no `subreddit_id` — posts are independent.
- `posts.author_id` / `comments.author_id` reference `user.id` with `ON DELETE CASCADE`.
- `request_id` + author unique indexes make post/comment creation idempotent.
- `chat_rooms.pair_key` deduplicates 1:1 rooms from member IDs.
- `reports`/`moderation_actions` use polymorphic `target_type`/`target_id` — no FK, update by hand in maintenance scripts.

## 2. Migration layout

`migrations/` contains exactly two files:

```text
0001_init.sql                  full Sokdak baseline schema (fresh databases)
0002_legacy_scope_cleanup.sql  VTH → Sokdak upgrade path
```

**`0001_init.sql`** creates the complete current schema for a fresh database. Its name intentionally matches the first migration recorded in the production `d1_migrations` ledger, so it is skipped there instead of re-running.

**`0002_legacy_scope_cleanup.sql`** brings a database created by the old VTH migration history (0001–0050) to the same final shape:

- rebuilds `posts` without `subreddit_id`, translation, and legacy vote columns
- rebuilds `comments` without translation and legacy vote columns
- recreates feed/request-id indexes
- drops retired tables (subreddits, follows, friendships, presence, Q&A, marketplace, businesses, achievements, ads, billing, analytics, votes, passkey, …)
- drops `user.notifyFollows`

On a fresh database every statement is a safe no-op: rebuilds recreate the same structure, drops use `IF EXISTS`, and the baseline `user` table includes `notifyFollows` so the `DROP COLUMN` succeeds on both paths.

### Notes for operators

- Wrangler will warn that remotely-applied migrations `0002_better_auth.sql`…`0050_*.sql` are missing locally. That is expected after the squash — the production ledger is the record of what ran; the local files are what a fresh database needs.
- If a database already applied a `0051_remove_removed_product_scope.sql`, record `0002_legacy_scope_cleanup.sql` in its `d1_migrations` ledger manually to skip it.
- `0002` is destructive. Before applying to production: backup, dry run, and run `PRAGMA foreign_key_check` after.

## 3. Migration policy

- Forward-only. Never edit or delete a migration a database has already applied.
- New changes go in `NNNN_description.sql` files appended after `0002`.
- `PRAGMA foreign_keys = OFF` while rebuilding or dropping parent tables; restore `ON` at the end. `DROP TABLE` with enforcement on can cascade into children (`post_likes`, `post_saves`, `hidden_posts`, `comments`, `comment_likes`).
- After any migration work verify on a scratch database: `PRAGMA foreign_key_check` → zero rows.

## 4. Local commands

```bash
npm run db:migrate:local   # apply migrations to the local D1
npm run db:seed:local      # load seed.sql fixtures
npm run db:reset:local     # migrate + seed
npm run db:audit:local     # integrity audit (strict)
```

`seed.sql` contains Korean-language fixtures: users, posts, comments, likes, one DM room, notifications, banned words, and `dm_enabled=true` for local testing only.
