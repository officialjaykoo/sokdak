import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { OrganicFeedPage } from "@/lib/types";
import { mapPostProjection, type PostProjectionRow } from "@/lib/post-projection";
import { publicPostVisibilitySql } from "@/lib/content-visibility";
import {
  InvalidFeedCursorError,
  openFeedCursor,
  signFeedCursor,
} from "@/lib/security/feed-cursor";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export type FeedSort = "new" | "popular";
export const POPULAR_WINDOWS = ["day", "week", "month", "all"] as const;
export type PopularWindow = (typeof POPULAR_WINDOWS)[number];
export const DEFAULT_POPULAR_WINDOW: PopularWindow = "all";

export function parsePopularWindow(
  value: string | null | undefined
): PopularWindow | null {
  return value && POPULAR_WINDOWS.includes(value as PopularWindow)
    ? (value as PopularWindow)
    : null;
}

export function popularWindowStart(
  window: PopularWindow,
  now = new Date()
): string | null {
  if (window === "all") return null;
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const date = now.getUTCDate();
  const day = now.getUTCDay();
  const startDate =
    window === "day"
      ? date
      : window === "week"
        ? date - ((day + 6) % 7)
        : 1;
  return new Date(Date.UTC(year, month, startDate))
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

export async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

export async function getEnv(): Promise<CloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env;
}

type FeedQueryRow = PostProjectionRow & {
  engagement_rank?: number;
};

export async function getFeedPosts(options: {
  limit?: number;
  cursor?: string | null;
  authorId?: string | null;
  viewerUserId?: string | null;
  sort?: FeedSort;
  window?: PopularWindow;
}): Promise<OrganicFeedPage> {
  const db = await getDb();
  const limit = Math.min(
    Math.max(options.limit ?? DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  );
  const sort = options.sort ?? "new";
  const popularWindow = options.window ?? DEFAULT_POPULAR_WINDOW;
  const windowStart =
    sort === "popular" ? popularWindowStart(popularWindow) : null;
  const viewerUserId = options.viewerUserId ?? null;
  const authorId = options.authorId ?? null;
  const cursorContext = {
    sort,
    authorId,
    viewerId: viewerUserId,
    popularWindow: sort === "popular" ? popularWindow : null,
    windowStart,
  };
  const cursor = await openFeedCursor(options.cursor ?? null, cursorContext);
  const engagementRank = "p.like_count + (p.comment_count * 3)";

  const params: Array<string | number> = [];
  const where: string[] = [publicPostVisibilitySql()];

  const viewerLikeSelect = viewerUserId
    ? `EXISTS (
         SELECT 1 FROM post_likes pl
         WHERE pl.post_id = p.id AND pl.user_id = ?
       ) AS viewer_liked`
    : "0 AS viewer_liked";
  const viewerSavedSelect = viewerUserId
    ? `EXISTS (
         SELECT 1 FROM post_saves ps
         WHERE ps.post_id = p.id AND ps.user_id = ?
       ) AS viewer_saved`
    : "0 AS viewer_saved";
  if (viewerUserId) params.push(viewerUserId, viewerUserId);

  if (viewerUserId) {
    where.push(
      "p.id NOT IN (SELECT post_id FROM hidden_posts WHERE user_id = ?)"
    );
    params.push(viewerUserId);
    where.push(
      "p.author_id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = ?)"
    );
    params.push(viewerUserId);
    where.push(
      "p.author_id NOT IN (SELECT muted_id FROM user_mutes WHERE muter_id = ?)"
    );
    params.push(viewerUserId);
  }

  if (authorId) {
    where.push("p.author_id = ?");
    params.push(authorId);
  }

  if (sort === "popular" && windowStart) {
    where.push("p.created_at >= ?");
    params.push(windowStart);
  }

  if (cursor) {
    if (sort === "popular") {
      if (cursor.rank === undefined) {
        throw new InvalidFeedCursorError("Popular cursor is missing rank");
      }
      where.push(
        `(${engagementRank} < ? OR (${engagementRank} = ? AND
          (p.created_at < ? OR (p.created_at = ? AND p.id < ?))))`
      );
      params.push(
        cursor.rank,
        cursor.rank,
        cursor.createdAt,
        cursor.createdAt,
        cursor.id
      );
    } else {
      where.push("(p.created_at < ? OR (p.created_at = ? AND p.id < ?))");
      params.push(cursor.createdAt, cursor.createdAt, cursor.id);
    }
  }
  const statement = db
    .prepare(
      `SELECT
         p.id,
         p.rowid AS num,
         p.title,
         p.body,
         p.url,
         p.media_key,
         p.like_count,
         p.comment_count,
         p.views,
         p.is_notice,
         ${engagementRank} AS engagement_rank,
         p.created_at,
         u.id AS author_id,
         u.role AS author_role,
         ${viewerLikeSelect},
         ${viewerSavedSelect}
       FROM posts p
       INNER JOIN "user" u ON u.id = p.author_id
       WHERE ${where.join(" AND ")}
       ORDER BY ${
         sort === "popular" ? `${engagementRank} DESC,` : ""
       } p.created_at DESC, p.id DESC
       LIMIT ?`
    )
    .bind(...params, limit + 1);

  const { results } = await statement.all<FeedQueryRow>();
  const rows = results ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.at(-1);

  return {
    posts: page.map((row) => mapPostProjection(row, viewerUserId)),
    nextCursor:
      hasMore && last
        ? await signFeedCursor(
            {
              rank:
                sort === "popular"
                  ? Number(last.engagement_rank ?? 0)
                  : undefined,
              createdAt: last.created_at,
              id: last.id,
            },
            cursorContext
          )
        : null,
    hasMore,
  };
}

export { InvalidFeedCursorError };

export interface BoardPage {
  notices: FeedPostForBoard[];
  posts: FeedPostForBoard[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

type FeedPostForBoard = ReturnType<typeof mapPostProjection>;

const NOTICE_LIMIT = 10;

/**
 * GNU-style offset pagination for the board list.
 * Notices are pinned above the regular list on every page and are excluded
 * from the regular list/count.
 */
export async function getBoardPosts(options: {
  page?: number;
  perPage?: number;
  viewerUserId?: string | null;
  sort?: FeedSort;
  window?: PopularWindow;
}): Promise<BoardPage> {
  const db = await getDb();
  const perPage = Math.min(
    Math.max(options.perPage ?? DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  );
  const sort = options.sort ?? "new";
  const popularWindow = options.window ?? DEFAULT_POPULAR_WINDOW;
  const windowStart =
    sort === "popular" ? popularWindowStart(popularWindow) : null;
  const viewerUserId = options.viewerUserId ?? null;
  const engagementRank = "p.like_count + (p.comment_count * 3)";

  const viewerLikeSelect = viewerUserId
    ? `EXISTS (
         SELECT 1 FROM post_likes pl
         WHERE pl.post_id = p.id AND pl.user_id = ?
       ) AS viewer_liked`
    : "0 AS viewer_liked";
  const viewerSavedSelect = viewerUserId
    ? `EXISTS (
         SELECT 1 FROM post_saves ps
         WHERE ps.post_id = p.id AND ps.user_id = ?
       ) AS viewer_saved`
    : "0 AS viewer_saved";

  const selectColumns = `
         p.id,
         p.rowid AS num,
         p.title,
         p.body,
         p.url,
         p.media_key,
         p.like_count,
         p.comment_count,
         p.views,
         p.is_notice,
         p.created_at,
         u.id AS author_id,
         u.role AS author_role,
         ${viewerLikeSelect},
         ${viewerSavedSelect}`;

  // Personal filters apply to both the notice pinboard and the list.
  const personalWhere: string[] = [];
  const personalParams: Array<string | number> = [];
  if (viewerUserId) {
    personalWhere.push(
      "p.id NOT IN (SELECT post_id FROM hidden_posts WHERE user_id = ?)",
      "p.author_id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = ?)",
      "p.author_id NOT IN (SELECT muted_id FROM user_mutes WHERE muter_id = ?)"
    );
    personalParams.push(viewerUserId, viewerUserId, viewerUserId);
  }

  const baseWhere: string[] = [publicPostVisibilitySql()];
  if (sort === "popular" && windowStart) {
    baseWhere.push("p.created_at >= ?");
  }

  // Notices stay pinned regardless of the popular-sort time window.
  const noticesPromise = db
    .prepare(
      `SELECT ${selectColumns}
       FROM posts p
       INNER JOIN "user" u ON u.id = p.author_id
       WHERE ${[publicPostVisibilitySql(), "p.is_notice = 1", ...personalWhere].join(" AND ")}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ?`
    )
    .bind(
      ...(viewerUserId ? [viewerUserId, viewerUserId] : []),
      ...personalParams,
      NOTICE_LIMIT
    )
    .all<PostProjectionRow>();

  const countPromise = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM posts p
       WHERE ${[...baseWhere, "p.is_notice = 0", ...personalWhere].join(" AND ")}`
    )
    .bind(
      ...(windowStart ? [windowStart] : []),
      ...personalParams
    )
    .first<{ count: number }>();

  const [noticesResult, countRow] = await Promise.all([
    noticesPromise,
    countPromise,
  ]);

  const total = Number(countRow?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(options.page ?? 1, 1), totalPages);
  const orderBy =
    sort === "popular"
      ? `${engagementRank} DESC, p.created_at DESC, p.id DESC`
      : "p.created_at DESC, p.id DESC";

  const { results } = await db
    .prepare(
      `SELECT ${selectColumns}
       FROM posts p
       INNER JOIN "user" u ON u.id = p.author_id
       WHERE ${[...baseWhere, "p.is_notice = 0", ...personalWhere].join(" AND ")}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
    )
    .bind(
      ...(viewerUserId ? [viewerUserId, viewerUserId] : []),
      ...(windowStart ? [windowStart] : []),
      ...personalParams,
      perPage,
      (page - 1) * perPage
    )
    .all<PostProjectionRow>();

  return {
    notices: (noticesResult.results ?? []).map((row) =>
      mapPostProjection(row, viewerUserId)
    ),
    posts: (results ?? []).map((row) => mapPostProjection(row, viewerUserId)),
    page,
    perPage,
    total,
    totalPages,
  };
}
