PRAGMA foreign_keys = OFF;

-- Sokdak scope reduction: drop product areas removed from the fork.
-- Posts become independent of communities; translation, votes, follows,
-- friends, presence, Q&A, marketplace, businesses, achievements, ads,
-- monetization, analytics rollups, and passkeys are removed.
--
-- This file is the upgrade path for databases created by the VTH
-- migration history (0001-0050). On a fresh database 0001_init.sql
-- already produced the final shape, so every statement below is
-- intentionally a safe no-op there: rebuilds recreate the same
-- structure, drops use IF EXISTS, and notifyFollows exists in the
-- baseline user table so the DROP COLUMN succeeds on both paths.
--
-- These drops are destructive. Before applying to production data:
-- backup, dry run, verify foreign keys, and confirm the rows are expendable.
--
-- foreign_keys stays OFF for the whole file: posts/comments are rebuilt in
-- place, and DROP TABLE would otherwise cascade into surviving children
-- (post_likes, post_saves, hidden_posts, comments, comment_likes).

-- Rebuild posts without the subreddit/translation/legacy-vote columns.
-- (subreddit_id has a foreign key and indexes, so ALTER COLUMN cannot drop it.)
CREATE TABLE posts_new (
  id TEXT PRIMARY KEY NOT NULL,
  author_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  media_key TEXT,
  like_count INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  comment_count INTEGER NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
  is_locked INTEGER NOT NULL DEFAULT 0 CHECK (is_locked IN (0, 1)),
  is_removed INTEGER NOT NULL DEFAULT 0 CHECK (is_removed IN (0, 1)),
  is_shadow_hidden INTEGER NOT NULL DEFAULT 0 CHECK (is_shadow_hidden IN (0, 1)),
  request_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO posts_new
SELECT
  id, author_id, title, body, url, media_key,
  like_count, comment_count, is_locked, is_removed, is_shadow_hidden,
  request_id, created_at, updated_at
FROM posts;

DROP TABLE posts;
ALTER TABLE posts_new RENAME TO posts;

-- Rebuild comments without translation/legacy-vote columns.
CREATE TABLE comments_new (
  id TEXT PRIMARY KEY NOT NULL,
  post_id TEXT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  -- References the current `comments` table by name. The old table is dropped
  -- before this one is renamed to `comments`, so after the rename the FK
  -- resolves to this table itself. (A self-reference written as
  -- `comments_new` would keep pointing at the dropped name — SQLite does not
  -- rewrite a table's own self-reference on RENAME.)
  parent_id TEXT REFERENCES comments (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  like_count INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  depth INTEGER NOT NULL DEFAULT 0 CHECK (depth >= 0),
  is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
  is_removed INTEGER NOT NULL DEFAULT 0 CHECK (is_removed IN (0, 1)),
  is_shadow_hidden INTEGER NOT NULL DEFAULT 0 CHECK (is_shadow_hidden IN (0, 1)),
  request_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO comments_new
SELECT
  id, post_id, author_id, parent_id, body,
  like_count, depth, is_deleted, is_removed, is_shadow_hidden,
  request_id, created_at, updated_at
FROM comments;

DROP TABLE comments;
ALTER TABLE comments_new RENAME TO comments;

-- Feed ordering indexes (recreated on the new tables).
CREATE INDEX IF NOT EXISTS idx_posts_public_engagement_rank
  ON posts (
    is_removed,
    is_shadow_hidden,
    (like_count + (comment_count * 3)) DESC,
    created_at DESC,
    id DESC
  );
CREATE INDEX IF NOT EXISTS idx_posts_public_created
  ON posts (is_removed, is_shadow_hidden, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author
  ON posts (author_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_author_request
  ON posts (author_id, request_id)
  WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comments_public_post
  ON comments (
    post_id,
    is_shadow_hidden,
    is_removed,
    is_deleted,
    created_at ASC,
    id ASC
  );
CREATE INDEX IF NOT EXISTS idx_comments_author
  ON comments (author_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_author_request
  ON comments (author_id, request_id)
  WHERE request_id IS NOT NULL;

-- Retired product tables. All of these are unreferenced by application code.
-- Children are dropped before their parents; with foreign_keys OFF the
-- ordering only matters for readability.

-- Q&A
DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS questions;

-- Marketplace
DROP TABLE IF EXISTS listing_reports;
DROP TABLE IF EXISTS listing_saves;
DROP TABLE IF EXISTS listings;

-- Local businesses
DROP TABLE IF EXISTS business_bookings;
DROP TABLE IF EXISTS business_services;
DROP TABLE IF EXISTS business_verification_requests;
DROP TABLE IF EXISTS businesses;

-- Social graph / presence / activity
DROP TABLE IF EXISTS user_follows;
DROP TABLE IF EXISTS user_friendships;
DROP TABLE IF EXISTS user_presence;
DROP TABLE IF EXISTS user_activity;

-- Communities
DROP TABLE IF EXISTS subreddit_moderators;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS subreddits;

-- Legacy voting / rate limiting
DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS vote_events;
DROP TABLE IF EXISTS rate_limits;

-- Achievements / badges / karma
DROP TABLE IF EXISTS user_achievements;
DROP TABLE IF EXISTS achievements;
DROP TABLE IF EXISTS reputation_ledger;

-- Ads and monetization
DROP TABLE IF EXISTS ad_impressions;
DROP TABLE IF EXISTS ad_clicks;
DROP TABLE IF EXISTS ad_campaigns;
DROP TABLE IF EXISTS billing_events;
DROP TABLE IF EXISTS pro_subscriptions;
DROP TABLE IF EXISTS transaction_ledger;
DROP TABLE IF EXISTS user_consents;

-- Analytics rollups and unused auth surface
DROP TABLE IF EXISTS post_views;
DROP TABLE IF EXISTS post_link_clicks;
DROP TABLE IF EXISTS passkey;

-- Dead user column (follow notifications are gone). The nsfw/reputation
-- columns were already dropped by 0049.
ALTER TABLE "user" DROP COLUMN notifyFollows;

PRAGMA foreign_keys = ON;
