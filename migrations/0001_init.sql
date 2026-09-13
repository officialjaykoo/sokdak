PRAGMA foreign_keys = OFF;

-- Sokdak baseline schema.
-- This file replaces the VTH migration history (0001-0050) for fresh
-- databases. Existing databases already carry a d1_migrations ledger
-- entry for 0001_init.sql, so this file is skipped there; the legacy
-- scope cleanup in 0002_legacy_scope_cleanup.sql brings them to this
-- same final shape. The notifyFollows column is created here only so
-- 0002 can drop it uniformly on both paths.

CREATE TABLE IF NOT EXISTS "account" (
  id TEXT PRIMARY KEY NOT NULL,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt TEXT,
  refreshTokenExpiresAt TEXT,
  scope TEXT,
  password TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'default',
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS banned_words (
  id TEXT PRIMARY KEY NOT NULL,
  word TEXT NOT NULL UNIQUE COLLATE NOCASE,
  severity TEXT NOT NULL DEFAULT 'shadow' CHECK (severity IN ('shadow', 'block')),
  created_by TEXT REFERENCES "user" (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_message_reports (
  id TEXT PRIMARY KEY NOT NULL,
  message_id TEXT NOT NULL REFERENCES chat_messages (id) ON DELETE CASCADE,
  room_id TEXT NOT NULL REFERENCES chat_rooms (id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (
    reason IN ('spam', 'harassment', 'hate', 'misinformation', 'nsfw', 'other')
  ),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewed', 'dismissed')),
  reviewed_by TEXT REFERENCES "user" (id) ON DELETE SET NULL,
  reviewed_at TEXT,
  resolution_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (message_id, reporter_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY NOT NULL,
  room_id TEXT NOT NULL REFERENCES chat_rooms (id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  -- Held until the recipient accepts the chat request
  delivery_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'delivered')),
  is_shadow_hidden INTEGER NOT NULL DEFAULT 0 CHECK (is_shadow_hidden IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
, is_moderation_hidden INTEGER NOT NULL DEFAULT 0
  CHECK (is_moderation_hidden IN (0, 1)), request_id TEXT, client_message_id TEXT);

CREATE TABLE IF NOT EXISTS chat_requests (
  id TEXT PRIMARY KEY NOT NULL,
  room_id TEXT NOT NULL REFERENCES chat_rooms (id) ON DELETE CASCADE,
  from_user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  opener_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  responded_at TEXT
, request_id TEXT);

CREATE TABLE IF NOT EXISTS chat_room_members (
  room_id TEXT NOT NULL REFERENCES chat_rooms (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'owner')),
  membership_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (membership_status IN ('pending', 'active', 'declined', 'left')),
  joined_at TEXT,
  last_read_at TEXT, last_read_message_id TEXT,
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_room_reports (
  id TEXT PRIMARY KEY NOT NULL,
  room_id TEXT NOT NULL REFERENCES chat_rooms (id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  reported_user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (
    reason IN ('spam', 'harassment', 'hate', 'misinformation', 'nsfw', 'other')
  ),
  details TEXT,
  context_until TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewed', 'dismissed')),
  reviewed_by TEXT REFERENCES "user" (id) ON DELETE SET NULL,
  reviewed_at TEXT,
  resolution_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (room_id, reporter_id)
);

CREATE TABLE IF NOT EXISTS chat_rooms (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL DEFAULT 'dm' CHECK (kind IN ('dm')),
  pair_key TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_message_at TEXT
);

CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id TEXT NOT NULL REFERENCES comments (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (comment_id, user_id)
);

CREATE TABLE IF NOT EXISTS "comments" (
  id TEXT PRIMARY KEY NOT NULL,
  post_id TEXT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES "comments" (id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS hidden_posts (
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  post_id TEXT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS media_objects (
  media_key TEXT PRIMARY KEY NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS moderation_actions (
  id TEXT PRIMARY KEY NOT NULL,
  actor_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  target_user_id TEXT REFERENCES "user" (id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'post', 'comment', 'subreddit')),
  target_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'ban', 'unban', 'warn', 'shadowban', 'unshadowban',
    'remove', 'restore', 'delete_account', 'delete_subreddit'
  )),
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "notifications" (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES "user" (id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN (
    'comment_on_post',
    'reply_to_comment',
    'follow',
    'chat_request',
    'chat_accepted',
    'warning',
    'mention',
    'friend_request',
    'friend_accepted'
  )),
  title TEXT NOT NULL,
  body TEXT,
  href TEXT,
  post_id TEXT REFERENCES posts (id) ON DELETE SET NULL,
  comment_id TEXT REFERENCES comments (id) ON DELETE SET NULL,
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
, source_request_id TEXT);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id TEXT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_saves (
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  post_id TEXT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS "posts" (
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

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  failure_count INTEGER NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  last_success_at TEXT,
  disabled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY NOT NULL,
  reporter_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'user')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'spam', 'harassment', 'hate', 'misinformation', 'nsfw', 'other'
  )),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (reporter_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS security_rate_events (
  id TEXT PRIMARY KEY NOT NULL,
  subject TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "session" (
  id TEXT PRIMARY KEY NOT NULL,
  expiresAt TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT REFERENCES "user" (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS unread_fanout (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  notification_count INTEGER NOT NULL DEFAULT 0 CHECK (notification_count >= 0),
  message_count INTEGER NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  emailVerified INTEGER NOT NULL DEFAULT 0 CHECK (emailVerified IN (0, 1)),
  image TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  username TEXT UNIQUE COLLATE NOCASE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'banned', 'shadowbanned')),
  bio TEXT
, preferredLanguage TEXT NOT NULL DEFAULT 'unknown', bannerKey TEXT, theme TEXT NOT NULL DEFAULT 'system', allowDms TEXT NOT NULL DEFAULT 'anyone', notifyComments INTEGER NOT NULL DEFAULT 1, notifyChat INTEGER NOT NULL DEFAULT 1, notifyMentions INTEGER NOT NULL DEFAULT 1, contactEmail TEXT, onboardingComplete INTEGER NOT NULL DEFAULT 0 CHECK (onboardingComplete IN (0, 1)), onboardingUsernameCandidate TEXT, usernameChangedAt TEXT, notifyFollows INTEGER NOT NULL DEFAULT 1);

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

CREATE TABLE IF NOT EXISTS user_mutes (
  muter_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  muted_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (muter_id, muted_id),
  CHECK (muter_id != muted_id)
);

CREATE TABLE IF NOT EXISTS user_warnings (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  issued_by TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS username_history (
  id TEXT PRIMARY KEY NOT NULL,
  userId TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  username TEXT NOT NULL COLLATE NOCASE,
  changedAt TEXT NOT NULL,
  reservedUntil TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification" (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_provider_account
  ON account (providerId, accountId);
CREATE INDEX IF NOT EXISTS idx_account_user ON account (userId);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_banned_words_word ON banned_words (word);
CREATE INDEX IF NOT EXISTS idx_chat_members_user
  ON chat_room_members (user_id, membership_status);
CREATE INDEX IF NOT EXISTS idx_chat_message_reports_message
  ON chat_message_reports (message_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_message_reports_room
  ON chat_message_reports (room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_message_reports_status
  ON chat_message_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room
  ON chat_messages (room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_order
  ON chat_messages (room_id, created_at DESC, id DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_messages_room_sender_client
  ON chat_messages (room_id, sender_id, client_message_id)
  WHERE client_message_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_messages_sender_request
  ON chat_messages (sender_id, request_id)
  WHERE request_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_requests_open_pair
  ON chat_requests (from_user_id, to_user_id)
  WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_requests_room_pending
  ON chat_requests (room_id)
  WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_requests_sender_request
  ON chat_requests (from_user_id, request_id)
  WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_requests_to
  ON chat_requests (to_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_room_reports_reported_user
  ON chat_room_reports (reported_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_room_reports_room
  ON chat_room_reports (room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_room_reports_status
  ON chat_room_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user
  ON comment_likes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_author
  ON comments (author_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_author_request
  ON comments (author_id, request_id)
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
CREATE INDEX IF NOT EXISTS idx_hidden_posts_user ON hidden_posts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_objects_cleanup
  ON media_objects (created_at, uploaded_by);
CREATE INDEX IF NOT EXISTS idx_moderation_user ON moderation_actions (target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_actionable
  ON notifications (user_id, actor_id, kind, source_request_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_user
  ON post_likes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_saves_post
  ON post_saves (post_id);
CREATE INDEX IF NOT EXISTS idx_post_saves_user_created
  ON post_saves (user_id, created_at DESC, post_id DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author
  ON posts (author_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_author_request
  ON posts (author_id, request_id)
  WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_public_created
  ON posts (is_removed, is_shadow_hidden, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_posts_public_engagement_rank
  ON posts (
    is_removed,
    is_shadow_hidden,
    (like_count + (comment_count * 3)) DESC,
    created_at DESC,
    id DESC
  );
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON push_subscriptions (user_id, disabled_at, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_security_rate_subject_action
  ON security_rate_events (subject, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_user ON session (userId);
CREATE INDEX IF NOT EXISTS idx_unread_fanout_updated
  ON unread_fanout (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks (blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_mutes_muted
  ON user_mutes (muted_id);
CREATE INDEX IF NOT EXISTS idx_user_mutes_muter_created
  ON user_mutes (muter_id, created_at DESC, muted_id);
CREATE INDEX IF NOT EXISTS idx_user_status ON "user" (status);
CREATE INDEX IF NOT EXISTS idx_user_username ON "user" (username);
CREATE INDEX IF NOT EXISTS idx_username_history_lookup
  ON username_history (username COLLATE NOCASE, changedAt DESC);
CREATE INDEX IF NOT EXISTS idx_username_history_user
  ON username_history (userId, changedAt DESC);
CREATE INDEX IF NOT EXISTS idx_warnings_user ON user_warnings (user_id, created_at DESC);

PRAGMA foreign_keys = ON;
