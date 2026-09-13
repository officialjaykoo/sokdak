# Sokdak product contract

**Status:** Canonical
**Product:** 속닥속닥 (Sokdak)
**Rule:** when implementation choices conflict with this document, update the document — do not silently fork the product intent.

## 1. Mission

속닥속닥 is a small anonymous community for Korean speakers. It provides a single shared feed of independent posts where people can talk freely under a pseudonymous handle without follower graphs or community management overhead.

## 2. Primary users

- Korean speakers who want lightweight, anonymous conversation.
- Moderators and admins who keep the shared space safe.

The product is intentionally small. There is no audience-growth machinery, no monetization, and no creator economy.

## 3. Feature scope

### In scope

- **Posts** — independent posts on a shared feed (latest / popular ordering). Posts do not belong to communities or boards.
- **Comments** — nested comment threads on posts.
- **Likes** — post and comment likes.
- **Personal controls** — save posts, hide posts, block users, mute users.
- **Reporting and moderation** — post/comment/user reports, moderation actions, user warnings, banned words, shadow-hiding.
- **Notifications** — comment/reply/mention/DM notifications plus unread fanout and optional web push.
- **Media** — image upload to R2 with per-user media ownership.
- **Messaging** — 1:1 chat rooms with message requests and realtime delivery. The code and history are retained; user-facing access is gated by `site_settings.dm_enabled` (default off).
- **Authentication** — Kakao social sign-in via Better Auth. Anonymous browsing is allowed for public content.
- **Localization** — Korean (default) and English UI.

### Out of scope (removed from the VTH fork)

- Communities / subreddits / boards and their moderation hierarchy
- Follow, friends, presence, and recommendation systems
- Q&A, marketplace, local businesses, bookings
- Achievements, badges, karma/reputation ledgers
- Advertising, billing, Pro subscriptions, monetization
- Post-view analytics and link-click tracking
- Content translation and Vietnamese/multilingual content
- Facebook and Zalo sign-in

Do not reintroduce these areas without an explicit product decision.

## 4. Product rules

1. **Anonymous-first.** Users interact under a mutable username; `user.id` stays hidden and immutable.
2. **One shared space.** All posts live on one feed. Ranking is engagement-based (`like_count + comment_count * 3`), not personalized.
3. **Safety by default.** Block overrides every contact permission. Reports, mutes, hides, and shadow-bans are first-class.
4. **Small and boring.** No growth loops, engagement optimization, or commerce.
5. **Recoverable state.** Everything user-visible must be reconstructable from D1; realtime and push are delivery only.

## 5. Feature flags

Runtime switches live in `site_settings` and are administered from the admin system panel. Definitions and defaults live in `src/lib/site-setting-definitions.ts`. Notable flags:

- `dm_enabled` — user-facing DM access (default `false`)
- `registration_open` — new account creation (default `true`)
- `site_name`, posting/DM/rate-limit quotas

## 6. Authentication and identity

- Active provider: **Kakao** only. Additional providers must not be enabled without a product decision.
- `user.id` is canonical immutable identity; `username` is a mutable public handle tracked by `username_history`.
- Legacy `vth_user_*` username prefixes are still recognized for carried-over accounts.
