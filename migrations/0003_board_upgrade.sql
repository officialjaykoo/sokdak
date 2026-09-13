PRAGMA foreign_keys = OFF;

-- Board-style upgrade: GNU-style list columns and jard-style anonymous
-- thread identity.
--
-- posts.views:      조회수 counter, incremented atomically on detail reads.
-- posts.is_notice:  공지 posts pinned at the top of the board list.
-- comments.num:     per-post sequential number used for >>N quoting and
--                   stable comment anchors.

ALTER TABLE posts ADD COLUMN views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0);
ALTER TABLE posts ADD COLUMN is_notice INTEGER NOT NULL DEFAULT 0 CHECK (is_notice IN (0, 1));
ALTER TABLE comments ADD COLUMN num INTEGER;

-- Backfill per-post comment numbers in original insertion order.
UPDATE comments
SET num = (
  SELECT COUNT(*) + 1
  FROM comments prev
  WHERE prev.post_id = comments.post_id
    AND prev.rowid < comments.rowid
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_post_num
  ON comments (post_id, num)
  WHERE num IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_notice
  ON posts (is_notice, created_at DESC);

PRAGMA foreign_keys = ON;
