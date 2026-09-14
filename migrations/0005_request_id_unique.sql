-- Enforce write idempotency at the database level.
-- chat_messages already has a partial unique index on (sender_id, request_id);
-- posts and comments previously relied on check-then-act, which could still
-- duplicate a canonical row under concurrent retries.

CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_author_request
  ON posts (author_id, request_id)
  WHERE request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_author_request
  ON comments (author_id, request_id)
  WHERE request_id IS NOT NULL;
