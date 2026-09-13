import { getDb } from "@/lib/db";
import { anonTag } from "@/lib/anon-tag";
import { openFeedCursor, signFeedCursor } from "@/lib/security/feed-cursor";
import type { FeedPost, ViewerLike } from "@/lib/types";
import { resolveAccountTags, type AccountTag } from "@/lib/tags";
import {
  mapPostProjection,
  type PostProjectionRow,
} from "@/lib/post-projection";
import { publicPostVisibilitySql } from "@/lib/content-visibility";

export interface CommentNode {
  id: string;
  postId: string;
  parentId: string | null;
  /** Per-post sequential number — used for No.N display and >>N quoting. */
  num: number;
  body: string;
  likeCount: number;
  depth: number;
  createdAt: string;
  isDeleted: boolean;
  isRemoved: boolean;
  liked: ViewerLike;
  author: {
    id?: string;
    anonTag: string;
    /** True when this comment's author is the post's author (글쓴이). */
    isOp: boolean;
    tags: AccountTag[];
    isAuthor: boolean;
  };
  children: CommentNode[];
}

export interface PostDetail extends FeedPost {
  isLocked: boolean;
  comments: CommentNode[];
}

export interface PublicProfile {
  username: string | null;
  name: string;
  image: string | null;
  bio: string | null;
  bannerKey: string | null;
  createdAt: string;
  tags: AccountTag[];
}

/** Server-only profile record; moderation and identity fields never cross the DTO boundary. */
export interface ProfileRecord extends PublicProfile {
  id: string;
  status: string;
  role: string;
}

export async function getPostDetail(
  postId: string,
  viewerUserId?: string | null
): Promise<PostDetail | null> {
  const db = await getDb();

  // Board-style view counter. Atomic increment; the post SELECT below reads
  // the post-increment value. Views only count for publicly visible posts.
  await db
    .prepare(
      `UPDATE posts SET views = views + 1
       WHERE id = ? AND ${publicPostVisibilitySql("posts")}`
    )
    .bind(postId)
    .run();

  const post = viewerUserId
    ? await db
        .prepare(
          `SELECT
             p.id, p.rowid AS num, p.title, p.body, p.url, p.media_key,
             p.like_count, p.comment_count, p.views, p.is_notice,
             p.is_locked, p.created_at,
             u.id AS author_id,
             u.role AS author_role,
             EXISTS (
               SELECT 1 FROM post_likes pl
               WHERE pl.post_id = p.id AND pl.user_id = ?
             ) AS viewer_liked,
             EXISTS (
               SELECT 1 FROM post_saves ps
               WHERE ps.post_id = p.id AND ps.user_id = ?
             ) AS viewer_saved
           FROM posts p
           INNER JOIN "user" u ON u.id = p.author_id
           WHERE p.id = ? AND ${publicPostVisibilitySql()}`
        )
        .bind(viewerUserId, viewerUserId, postId)
        .first()
    : await db
        .prepare(
          `SELECT
             p.id, p.rowid AS num, p.title, p.body, p.url, p.media_key,
             p.like_count, p.comment_count, p.views, p.is_notice,
             p.is_locked, p.created_at,
             u.id AS author_id,
             u.role AS author_role,
             0 AS viewer_liked,
             0 AS viewer_saved
           FROM posts p
           INNER JOIN "user" u ON u.id = p.author_id
           WHERE p.id = ? AND ${publicPostVisibilitySql()}`
        )
        .bind(postId)
        .first();

  if (!post) return null;

  const { results } = viewerUserId
    ? await db
        .prepare(
          `SELECT
             c.id, c.post_id, c.parent_id, c.num, c.body, c.like_count,
             c.depth, c.created_at, c.is_deleted, c.is_removed,
             c.is_shadow_hidden,
             u.id AS author_id,
             u.role AS author_role,
             EXISTS (
               SELECT 1 FROM comment_likes cl
               WHERE cl.comment_id = c.id AND cl.user_id = ?
             ) AS viewer_liked,
             EXISTS (
               SELECT 1 FROM user_blocks b
               WHERE b.blocker_id = ? AND b.blocked_id = c.author_id
             ) AS viewer_blocked
           FROM comments c
           INNER JOIN "user" u ON u.id = c.author_id
           WHERE c.post_id = ?
             AND c.is_shadow_hidden = 0
             AND (
               (c.is_removed = 0 AND c.is_deleted = 0)
               OR EXISTS (
                 SELECT 1
                 FROM comments child
                 WHERE child.parent_id = c.id
                   AND child.is_removed = 0
                   AND child.is_shadow_hidden = 0
               )
             )
           ORDER BY c.created_at ASC, c.id ASC`
        )
        .bind(viewerUserId, viewerUserId, postId)
        .all()
    : await db
        .prepare(
          `SELECT
             c.id, c.post_id, c.parent_id, c.num, c.body, c.like_count,
             c.depth, c.created_at, c.is_deleted, c.is_removed,
             c.is_shadow_hidden,
             u.id AS author_id,
             u.role AS author_role,
             0 AS viewer_liked,
             0 AS viewer_blocked
           FROM comments c
           INNER JOIN "user" u ON u.id = c.author_id
           WHERE c.post_id = ?
             AND c.is_shadow_hidden = 0
             AND (
               (c.is_removed = 0 AND c.is_deleted = 0)
               OR EXISTS (
                 SELECT 1
                 FROM comments child
                 WHERE child.parent_id = c.id
                   AND child.is_removed = 0
                   AND child.is_shadow_hidden = 0
               )
             )
           ORDER BY c.created_at ASC, c.id ASC`
        )
        .bind(postId)
        .all();

  const nodes = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  const postAuthorId = (post as { author_id: string }).author_id;

  for (const raw of results ?? []) {
    const row = raw as {
      id: string;
      post_id: string;
      parent_id: string | null;
      num: number | null;
      body: string;
      like_count: number;
      depth: number;
      created_at: string;
      is_deleted: number;
      is_removed: number;
      is_shadow_hidden: number;
      author_id: string;
      author_role: string | null;
      viewer_liked: number | null;
      viewer_blocked: number | null;
    };
    if (row.is_shadow_hidden) continue;
    const viewerBlocked = Boolean(row.viewer_blocked);
    const node: CommentNode = {
      id: row.id,
      postId: row.post_id,
      parentId: row.parent_id,
      num: Number(row.num ?? 0),
      body:
        viewerBlocked || row.is_deleted
          ? "[deleted]"
          : row.is_removed
            ? "[removed]"
            : row.body,
      likeCount: viewerBlocked ? 0 : Number(row.like_count ?? 0),
      depth: row.depth,
      createdAt: row.created_at,
      isDeleted: viewerBlocked ? true : Boolean(row.is_deleted),
      isRemoved: Boolean(row.is_removed),
      liked: Boolean(row.viewer_liked),
      author: {
        id: row.author_id,
        anonTag: anonTag(row.post_id, row.author_id),
        isOp: row.author_id === postAuthorId,
        tags: resolveAccountTags({ role: row.author_role }),
        isAuthor: Boolean(viewerUserId && viewerUserId === row.author_id),
      },
      children: [],
    };
    nodes.set(node.id, node);
  }

  for (const node of nodes.values()) {
    if (node.parentId === null) {
      roots.push(node);
      continue;
    }

    const parent = nodes.get(node.parentId);
    if (parent) {
      parent.children.push(node);
      continue;
    }

    console.warn("comment_tree_orphan", {
      commentId: node.id,
      parentId: node.parentId,
      postId: node.postId,
    });
  }

  return {
    ...mapPostProjection(post as PostProjectionRow, viewerUserId),
    isLocked: Boolean((post as { is_locked: number }).is_locked),
    comments: roots,
  };
}

type PublicProfileRow = {
  id: string;
  username: string | null;
  name: string;
  image: string | null;
  bio: string | null;
  bannerKey: string | null;
  createdAt: string;
  status: string;
  role: string;
};

const PUBLIC_PROFILE_SELECT = `
  SELECT u.id, u.username, u.name, u.image, u.bio, u.bannerKey,
         u.createdAt, u.status, u.role
`;

function mapProfileRecord(row: PublicProfileRow): ProfileRecord {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    image: row.image,
    bio: row.bio,
    bannerKey: row.bannerKey,
    createdAt: row.createdAt,
    status: row.status,
    role: row.role,
    tags: resolveAccountTags({ role: row.role }),
  };
}

export function toPublicProfile(profile: ProfileRecord): PublicProfile {
  return {
    username: profile.username,
    name: profile.name,
    image: profile.image,
    bio: profile.bio,
    bannerKey: profile.bannerKey,
    createdAt: profile.createdAt,
    tags: profile.tags,
  };
}

export type PublicProfileLookup = {
  profile: ProfileRecord;
  redirectUsername: string | null;
};

export async function resolvePublicProfile(
  username: string
): Promise<PublicProfileLookup | null> {
  const db = await getDb();
  const current = await db
    .prepare(
      `${PUBLIC_PROFILE_SELECT}
       FROM "user" u
       WHERE u.username = ? COLLATE NOCASE`
    )
    .bind(username)
    .first<PublicProfileRow>();
  if (current) {
    return { profile: mapProfileRecord(current), redirectUsername: null };
  }

  const historical = await db
    .prepare(
      `${PUBLIC_PROFILE_SELECT}, h.username AS historicalUsername
       FROM username_history h
       INNER JOIN "user" u ON u.id = h.userId
       WHERE h.username = ? COLLATE NOCASE
         AND u.username IS NOT NULL
       ORDER BY h.changedAt DESC
       LIMIT 1`
    )
    .bind(username)
    .first<PublicProfileRow & { historicalUsername: string }>();
  if (!historical) return null;

  return {
    profile: mapProfileRecord(historical),
    redirectUsername: historical.username,
  };
}

export async function getPublicProfile(
  identifier: string
): Promise<PublicProfile | null> {
  const lookup = await resolvePublicProfile(identifier);
  return lookup ? toPublicProfile(lookup.profile) : null;
}

export interface ProfileComment {
  id: string;
  postId: string;
  postTitle: string;
  body: string;
  likeCount: number;
  createdAt: string;
}

export type ProfileCommentPage = {
  comments: ProfileComment[];
  nextCursor: string | null;
  hasMore: boolean;
};

export async function listUserCommentsPage(
  authorId: string,
  options: { limit?: number; cursor?: string | null } = {}
): Promise<ProfileCommentPage> {
  const db = await getDb();
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 50);
  const cursorContext = {
    sort: "new" as const,
    authorId,
    viewerId: null,
    scope: "comments" as const,
  };
  const cursor = await openFeedCursor(options.cursor ?? null, cursorContext);
  const params: Array<string | number> = [authorId];
  const cursorClause = cursor
    ? " AND (c.created_at < ? OR (c.created_at = ? AND c.id < ?))"
    : "";
  if (cursor) {
    params.push(cursor.createdAt, cursor.createdAt, cursor.id);
  }

  const { results } = await db
    .prepare(
      `SELECT
         c.id,
         c.post_id,
         c.body,
         c.like_count,
         c.created_at,
         c.is_deleted,
         p.title AS post_title
       FROM comments c
       INNER JOIN posts p ON p.id = c.post_id
       WHERE c.author_id = ?
         AND c.is_removed = 0
         AND c.is_deleted = 0
         AND c.is_shadow_hidden = 0
         AND ${publicPostVisibilitySql()}
         ${cursorClause}
       ORDER BY c.created_at DESC, c.id DESC
       LIMIT ?`
    )
    .bind(...params, limit + 1)
    .all<{
      id: string;
      post_id: string;
      body: string;
      like_count: number;
      created_at: string;
      is_deleted: number;
      post_title: string;
    }>();

  const rows = results ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const comments = page.map((row) => ({
    id: row.id,
    postId: row.post_id,
    postTitle: row.post_title,
    body: row.is_deleted ? "[deleted]" : row.body,
    likeCount: Number(row.like_count ?? 0),
    createdAt: row.created_at,
  }));
  const last = page.at(-1);
  return {
    comments,
    hasMore,
    nextCursor:
      hasMore && last
        ? await signFeedCursor(
            { createdAt: last.created_at, id: last.id },
            cursorContext
          )
        : null,
  };
}

/** Recent comments by a user for overview/profile callers. */
export async function listUserComments(
  authorId: string,
  limit = 30
): Promise<ProfileComment[]> {
  return (await listUserCommentsPage(authorId, { limit })).comments;
}
