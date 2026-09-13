import type { AccountTag } from "@/lib/tags";

export type LikeMutation = "like" | "unlike";
export type ViewerLike = boolean;

export interface UserRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface PostRow {
  id: string;
  author_id: string;
  title: string;
  body: string | null;
  url: string | null;
  media_key: string | null;
  like_count: number;
  comment_count: number;
  is_locked: number;
  created_at: string;
  updated_at: string;
}

export interface CommentRow {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  like_count: number;
  depth: number;
  is_deleted: number;
  is_removed: number;
  created_at: string;
  updated_at: string;
}

export interface FeedPost {
  id: string;
  /** Stable board number (SQLite rowid). */
  num: number;
  title: string;
  body: string | null;
  url: string | null;
  mediaKey: string | null;
  likeCount: number;
  commentCount: number;
  views: number;
  isNotice: boolean;
  createdAt: string;
  liked: ViewerLike;
  saved: boolean;
  author: {
    /** Internal only — never serialized to the public API. */
    id?: string;
    /** Per-thread anonymous tag, e.g. "ab12" for 익명(ab12). */
    anonTag: string;
    tags: AccountTag[];
    isAuthor: boolean;
  };
}

/** Organic posts only, tagged for the public feed contract. */
export type FeedItem = FeedPost & { kind: "post" };

export interface OrganicFeedPage {
  posts: FeedPost[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PaginatedFeed {
  posts: FeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface LikeResult {
  postId: string;
  likeCount: number;
  liked: boolean;
}

export interface CommentLikeResult {
  commentId: string;
  likeCount: number;
  liked: boolean;
}

export interface ChatMessage {
  id: string;
  clientMessageId: string | null;
  body: string;
  createdAt: string;
  isMine: boolean;
  senderUsername: string | null;
}

export interface ChatHistoryPage {
  messages: ChatMessage[];
  hasMoreBefore: boolean;
  nextBeforeCursor: string | null;
  hasMoreAfter: boolean;
  nextAfterCursor: string | null;
}
