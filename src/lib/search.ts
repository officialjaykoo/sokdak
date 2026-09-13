import { getDb } from "@/lib/db";
import { anonTag } from "@/lib/anon-tag";
import { publicPostVisibilitySql } from "@/lib/content-visibility";

const MAX_QUERY_LENGTH = 80;

export type SearchPostHit = {
  id: string;
  title: string;
  body: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  /** Anonymous per-thread tag — the board never exposes the username. */
  authorTag: string;
};

export type SearchResults = {
  query: string;
  posts: SearchPostHit[];
};

export function normalizeSearchQuery(raw: string): string {
  return raw.trim().slice(0, MAX_QUERY_LENGTH);
}

/** Escape LIKE wildcards and wrap with %. */
export function likeContains(query: string): string {
  const escaped = query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  return `%${escaped}%`;
}

export async function searchAll(
  rawQuery: string,
  limits: {
    posts?: number;
  } = {},
  viewerUserId?: string | null
): Promise<SearchResults> {
  const query = normalizeSearchQuery(rawQuery);
  if (query.length < 1) {
    return { query, posts: [] };
  }

  const postLimit = limits.posts ?? 12;
  const pattern = likeContains(query);
  const posts = await searchPosts(pattern, postLimit, viewerUserId);

  return { query, posts };
}

async function searchPosts(
  pattern: string,
  limit: number,
  viewerUserId?: string | null
): Promise<SearchPostHit[]> {
  const db = await getDb();
  const viewerClause = viewerUserId
    ? `AND p.author_id NOT IN (SELECT muted_id FROM user_mutes WHERE muter_id = ?)
       AND p.author_id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = ?)`
    : "";
  const { results } = await db
    .prepare(
      `SELECT
         p.id, p.author_id, p.title, p.body, p.like_count, p.comment_count,
         p.created_at
       FROM posts p
       INNER JOIN "user" u ON u.id = p.author_id
       WHERE ${publicPostVisibilitySql()}
         ${viewerClause}
         AND (p.title LIKE ? ESCAPE '\\'
              OR IFNULL(p.body, '') LIKE ? ESCAPE '\\')
       ORDER BY p.like_count DESC, p.created_at DESC
       LIMIT ?`
    )
    .bind(
      ...(viewerUserId
        ? [viewerUserId, viewerUserId, pattern, pattern, limit]
        : [pattern, pattern, limit])
    )
    .all<{
      id: string;
      author_id: string;
      title: string;
      body: string | null;
      like_count: number;
      comment_count: number;
      created_at: string;
    }>();

  return (results ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    likeCount: Number(row.like_count ?? 0),
    commentCount: Number(row.comment_count ?? 0),
    createdAt: row.created_at,
    authorTag: anonTag(row.id, row.author_id),
  }));
}
