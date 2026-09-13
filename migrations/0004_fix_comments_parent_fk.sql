PRAGMA foreign_keys = OFF;

-- Repair migration: 0002 rebuilt comments as `comments_new` with a
-- self-referencing parent FK written as `REFERENCES comments_new (id)`.
-- SQLite does not rewrite a table's own self-reference on RENAME, so on any
-- database that ran the buggy 0002, comments.parent_id dangles to a
-- non-existent `comments_new` (foreign_key_check reports it).
--
-- Rebuild comments once more, writing the self-FK as `REFERENCES comments`
-- — resolvable to the old table at CREATE time, and to this table itself
-- after the drop + rename.

CREATE TABLE comments_fixed (
  id TEXT PRIMARY KEY NOT NULL,
  post_id TEXT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES comments (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  like_count INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  depth INTEGER NOT NULL DEFAULT 0 CHECK (depth >= 0),
  is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
  is_removed INTEGER NOT NULL DEFAULT 0 CHECK (is_removed IN (0, 1)),
  is_shadow_hidden INTEGER NOT NULL DEFAULT 0 CHECK (is_shadow_hidden IN (0, 1)),
  request_id TEXT,
  num INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO comments_fixed
SELECT
  id, post_id, author_id, parent_id, body,
  like_count, depth, is_deleted, is_removed, is_shadow_hidden,
  request_id, num, created_at, updated_at
FROM comments;

DROP TABLE comments;
ALTER TABLE comments_fixed RENAME TO comments;

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
CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_post_num
  ON comments (post_id, num)
  WHERE num IS NOT NULL;

PRAGMA foreign_keys = ON;
