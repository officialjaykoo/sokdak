import { getDb } from "@/lib/db";
import { invalidateBannedWordsCache } from "@/lib/moderation";
import { AuthError } from "@/lib/session";
import { revokeChatRoomsForUser } from "@/lib/chat-realtime";
import { runBackgroundTask } from "@/lib/background-task";

export async function setUserStatus(input: {
  actorId: string;
  targetUserId: string;
  action: "ban" | "unban" | "shadowban" | "unshadowban";
  reason?: string;
}) {
  const statusMap = {
    ban: "banned",
    unban: "active",
    shadowban: "shadowbanned",
    unshadowban: "active",
  } as const;

  if (input.actorId === input.targetUserId) {
    throw new AuthError("Cannot moderate your own account", 400);
  }
  const db = await getDb();
  const target = await db
    .prepare(`SELECT id FROM "user" WHERE id = ?`)
    .bind(input.targetUserId)
    .first();
  if (!target) throw new AuthError("User not found", 404);

  await db
    .prepare(
      `UPDATE "user" SET status = ?, updatedAt = datetime('now') WHERE id = ?`
    )
    .bind(statusMap[input.action], input.targetUserId)
    .run();

  await db
    .prepare(
      `INSERT INTO moderation_actions (
         id, actor_id, target_user_id, target_type, target_id, action, reason
       ) VALUES (?, ?, ?, 'user', ?, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      input.actorId,
      input.targetUserId,
      input.targetUserId,
      input.action,
      input.reason ?? null
    )
    .run();
  if (input.action === "ban") {
    runBackgroundTask("banned_user_chat_revoke", () =>
      revokeChatRoomsForUser(input.targetUserId)
    );
  }
}

export async function setPostNotice(input: {
  actorId: string;
  postId: string;
  notice: boolean;
}) {
  const db = await getDb();
  const result = await db
    .prepare(
      `UPDATE posts
       SET is_notice = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(input.notice ? 1 : 0, input.postId)
    .run();
  if (Number(result.meta.changes ?? 0) !== 1) {
    throw new AuthError("Post not found", 404);
  }
  return { ok: true as const };
}

export async function warnUser(input: {
  actorId: string;
  targetUserId: string;
  message: string;
}) {
  const message = input.message.trim();
  if (!message) throw new AuthError("Warning message required", 400);

  const db = await getDb();
  const target = await db
    .prepare(`SELECT id FROM "user" WHERE id = ?`)
    .bind(input.targetUserId)
    .first();
  if (!target) throw new AuthError("User not found", 404);

  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO user_warnings (id, user_id, issued_by, message) VALUES (?, ?, ?, ?)`
    )
    .bind(id, input.targetUserId, input.actorId, message)
    .run();

  await db
    .prepare(
      `INSERT INTO moderation_actions (
         id, actor_id, target_user_id, target_type, target_id, action, reason
       ) VALUES (?, ?, ?, 'user', ?, 'warn', ?)`
    )
    .bind(
      crypto.randomUUID(),
      input.actorId,
      input.targetUserId,
      input.targetUserId,
      message
    )
    .run();

  void (async () => {
    const { notifyQuietly } = await import("@/lib/notifications");
    notifyQuietly({
      userId: input.targetUserId,
      actorId: input.actorId,
      kind: "warning",
      title: "You received a warning from moderators",
      body: message,
      href: "/notifications",
    });
  })();

  return { id };
}

export async function deleteAccount(input: {
  actorId: string;
  targetUserId: string;
  reason?: string;
}) {
  if (input.actorId === input.targetUserId) {
    throw new AuthError("Cannot delete your own account", 400);
  }
  const db = await getDb();
  const statements = [
    db
      .prepare(
        `UPDATE "user"
         SET status = 'banned',
             name = 'deleted',
             username = NULL,
             bio = NULL,
             email = 'deleted_' || id || '@sokdak.invalid',
             updatedAt = datetime('now')
         WHERE id = ?`
      )
      .bind(input.targetUserId),
    db
      .prepare(
        `UPDATE posts
         SET is_removed = 1, updated_at = datetime('now')
         WHERE author_id = ?`
      )
      .bind(input.targetUserId),
    db
      .prepare(
        `UPDATE posts
         SET comment_count = MAX(
               0,
               comment_count - (
                 SELECT COUNT(*)
                 FROM comments c
                 WHERE c.post_id = posts.id
                   AND c.author_id = ?
                   AND c.is_removed = 0
                   AND c.is_deleted = 0
                   AND c.is_shadow_hidden = 0
               )
             ),
             updated_at = datetime('now')
         WHERE EXISTS (
           SELECT 1
           FROM comments c
           WHERE c.post_id = posts.id
             AND c.author_id = ?
             AND c.is_removed = 0
             AND c.is_deleted = 0
             AND c.is_shadow_hidden = 0
         )`
      )
      .bind(input.targetUserId, input.targetUserId),
    db
      .prepare(
        `UPDATE comments
         SET is_removed = 1,
             body = CASE WHEN is_deleted = 1 THEN '[deleted]' ELSE '[removed]' END,
             updated_at = datetime('now')
         WHERE author_id = ?`
      )
      .bind(input.targetUserId),
    db
      .prepare(
        `INSERT INTO moderation_actions (
           id, actor_id, target_user_id, target_type, target_id, action, reason
         ) VALUES (?, ?, ?, 'user', ?, 'delete_account', ?)`
      )
      .bind(
        crypto.randomUUID(),
        input.actorId,
        input.targetUserId,
        input.targetUserId,
        input.reason ?? null
      ),
  ];
  await db.batch(statements);
  runBackgroundTask("deleted_user_chat_revoke", () =>
    revokeChatRoomsForUser(input.targetUserId)
  );
}

export async function addBannedWord(input: {
  actorId: string;
  word: string;
  severity: "shadow" | "block";
}) {
  const word = input.word.trim().toLowerCase();
  if (word.length < 2) throw new AuthError("Word too short", 400);
  if (!["shadow", "block"].includes(input.severity)) {
    throw new AuthError("Invalid severity", 400);
  }

  const db = await getDb();
  const id = crypto.randomUUID();
  try {
    await db
      .prepare(
        `INSERT INTO banned_words (id, word, severity, created_by) VALUES (?, ?, ?, ?)`
      )
      .bind(id, word, input.severity, input.actorId)
      .run();
  } catch {
    throw new AuthError("Word already banned", 409);
  }
  invalidateBannedWordsCache().catch(() => {
    // cache best-effort
  });
  return { id, word, severity: input.severity };
}

export async function removeBannedWord(id: string) {
  const db = await getDb();
  await db.prepare(`DELETE FROM banned_words WHERE id = ?`).bind(id).run();
  invalidateBannedWordsCache().catch(() => {
    // cache best-effort
  });
}

export async function listAdminBannedWords() {
  const db = await getDb();
  const { results } = await db
    .prepare(`SELECT id, word, severity FROM banned_words ORDER BY word ASC`)
    .all<{ id: string; word: string; severity: string }>();
  return results ?? [];
}


export type AdminUser = {
  id: string;
  username: string | null;
  name: string;
  role: string;
  status: string;
  createdAt: string;
};

export async function getAdminDashboard() {
  const db = await getDb();
  const counts = await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM "user" WHERE status = 'active') AS users,
         (SELECT COUNT(*) FROM posts WHERE is_removed = 0) AS posts,
         (SELECT COUNT(*) FROM comments
          WHERE is_removed = 0 AND is_deleted = 0 AND is_shadow_hidden = 0) AS comments,
         (SELECT COUNT(*) FROM reports WHERE status = 'open') AS content_reports,
         (SELECT COUNT(*) FROM chat_message_reports WHERE status = 'open') +
           (SELECT COUNT(*) FROM chat_room_reports WHERE status = 'open') AS message_reports,
         (SELECT COUNT(*) FROM "user" WHERE status = 'banned') AS banned,
         (SELECT COUNT(*) FROM "user" WHERE status = 'shadowbanned') AS shadowbanned`
    )
    .first<Record<string, number>>();
  const { results: recentActions } = await db
    .prepare(
      `SELECT id, actor_id, target_user_id, target_type, target_id, action, reason, created_at
       FROM moderation_actions
       ORDER BY created_at DESC
       LIMIT 10`
    )
    .all();

  return {
    counts: counts ?? {},
    recentActions: recentActions ?? [],
  };
}

export async function listAdminUsers(input: {
  search?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const db = await getDb();
  const search = input.search?.trim() ?? "";
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const offset = Math.max(input.offset ?? 0, 0);
  const pattern = `%${search}%`;
  const { results } = await db
    .prepare(
      `SELECT id, username, name, role, status, createdAt
       FROM "user"
       WHERE (? = '' OR username LIKE ? OR name LIKE ? OR id LIKE ?)
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`
    )
    .bind(search, pattern, pattern, pattern, limit, offset)
    .all<AdminUser>();
  return results ?? [];
}
