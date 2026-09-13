import type { FeedPost } from "@/lib/types";
import { anonTag } from "@/lib/anon-tag";
import { resolveAccountTags } from "@/lib/tags";

export type PostProjectionRow = {
  id: string;
  num?: number;
  title: string;
  body: string | null;
  url: string | null;
  media_key: string | null;
  like_count: number;
  comment_count: number;
  views?: number;
  is_notice?: number;
  created_at: string;
  author_id: string;
  author_role?: string | null;
  viewer_liked?: number | null;
  viewer_saved?: number | null;
};

/**
 * Shared public post DTO used by board list, profile, and detail.
 * Author identity is always the per-thread anonymous tag — the username
 * never enters the public payload.
 */
export function mapPostProjection(
  row: PostProjectionRow,
  viewerUserId?: string | null
): FeedPost {
  return {
    id: row.id,
    num: Number(row.num ?? 0),
    title: row.title,
    body: row.body,
    url: row.url,
    mediaKey: row.media_key,
    createdAt: row.created_at,
    commentCount: Number(row.comment_count ?? 0),
    likeCount: Number(row.like_count ?? 0),
    views: Number(row.views ?? 0),
    isNotice: Boolean(row.is_notice),
    liked: Boolean(row.viewer_liked),
    saved: Boolean(row.viewer_saved),
    author: {
      id: row.author_id,
      anonTag: anonTag(row.id, row.author_id),
      tags: resolveAccountTags({ role: row.author_role }),
      isAuthor: Boolean(viewerUserId && viewerUserId === row.author_id),
    },
  };
}
