import { getDb } from "@/lib/db";
import { publicPostVisibilitySql } from "@/lib/content-visibility";
import { mapPostProjection, type PostProjectionRow } from "@/lib/post-projection";
import { AuthError } from "@/lib/session";
import type { FeedPost } from "@/lib/types";

export type PostSaveResult = {
  postId: string;
  saved: boolean;
};

type SavedPostRow = PostProjectionRow & {
  saved_at: string;
};

export async function setPostSaved(input: {
  userId: string;
  postId: string;
  saved: boolean;
}): Promise<PostSaveResult> {
  const db = await getDb();
  const post = await db
    .prepare(
      `SELECT p.id
       FROM posts p
       WHERE p.id = ? AND ${publicPostVisibilitySql()}`
    )
    .bind(input.postId)
    .first<{ id: string }>();

  if (!post) throw new AuthError("Post not found", 404);

  if (input.saved) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO post_saves (user_id, post_id)
         VALUES (?, ?)`
      )
      .bind(input.userId, input.postId)
      .run();
  } else {
    await db
      .prepare(
        `DELETE FROM post_saves
         WHERE user_id = ? AND post_id = ?`
      )
      .bind(input.userId, input.postId)
      .run();
  }

  return { postId: input.postId, saved: input.saved };
}

export async function listSavedPosts(
  userId: string,
  limit = 50
): Promise<FeedPost[]> {
  const db = await getDb();
  const boundedLimit = Math.min(Math.max(limit, 1), 100);
  const { results } = await db
    .prepare(
      `SELECT
         p.id, p.rowid AS num, p.title, p.body, p.url, p.media_key,
         p.like_count, p.comment_count, p.views, p.is_notice, p.created_at,
         u.id AS author_id, u.role AS author_role,
         EXISTS (
           SELECT 1 FROM post_likes pl
           WHERE pl.post_id = p.id AND pl.user_id = ?
         ) AS viewer_liked,
         1 AS viewer_saved,
         ps.created_at AS saved_at
       FROM post_saves ps
       INNER JOIN posts p ON p.id = ps.post_id
       INNER JOIN "user" u ON u.id = p.author_id
       WHERE ps.user_id = ?
         AND ${publicPostVisibilitySql()}
       ORDER BY ps.created_at DESC, ps.post_id DESC
       LIMIT ?`
    )
    .bind(userId, userId, boundedLimit)
    .all<SavedPostRow>();

  return (results ?? []).map((row) => mapPostProjection(row, userId));
}
