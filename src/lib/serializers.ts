import type { CommentNode, PostDetail } from "@/lib/content";
import type { AccountTag } from "@/lib/tags";
import type {
  FeedItem,
  FeedPost,
  PaginatedFeed,
} from "@/lib/types";

/** Public author — anonymous per-thread tag only. No username, no user id. */
export type PublicAuthor = {
  anonTag: string;
  tags: AccountTag[];
  isAuthor: boolean;
};

export type PublicFeedPost = Omit<FeedPost, "author"> & {
  kind: "post";
  author: PublicAuthor;
};
export type PublicFeedItem = PublicFeedPost;


export type PublicComment = {
  id: string;
  postId: string;
  parentId: string | null;
  num: number;
  body: string;
  likeCount: number;
  liked: boolean;
  depth: number;
  createdAt: string;
  isDeleted: boolean;
  isRemoved: boolean;
  author: PublicAuthor & { isOp: boolean };
  children: PublicComment[];
};

export type PublicPostDetail = PublicFeedPost & {
  isLocked: boolean;
  comments: PublicComment[];
};

export type PublicLikeResult = {
  postId: string;
  likeCount: number;
  liked: boolean;
};

export type PublicCommentLikeResult = {
  commentId: string;
  likeCount: number;
  liked: boolean;
};

function publicAuthor(author: {
  id?: string | null;
  anonTag: string;
  tags: AccountTag[];
  isAuthor?: boolean;
}): PublicAuthor {
  return {
    anonTag: author.anonTag,
    tags: author.tags ?? [],
    isAuthor: Boolean(author.isAuthor),
  };
}

export function serializeFeedPost(
  post: FeedPost
): PublicFeedPost {
  return {
    kind: "post",
    id: post.id,
    num: post.num,
    title: post.title,
    body: post.body,
    url: post.url,
    mediaKey: post.mediaKey,
    likeCount: post.likeCount,
    views: post.views,
    isNotice: post.isNotice,
    liked: post.liked,
    saved: post.saved,
    commentCount: post.commentCount,
    createdAt: post.createdAt,
    author: publicAuthor(post.author),
  };
}

export function serializeFeedItem(item: FeedItem): PublicFeedPost {
  return serializeFeedPost(item);
}

export function serializeFeed(feed: PaginatedFeed): {
  posts: PublicFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
} {
  return {
    posts: feed.posts.map(serializeFeedItem),
    nextCursor: feed.nextCursor,
    hasMore: feed.hasMore,
  };
}

export function serializeComment(comment: CommentNode): PublicComment {
  return {
    id: comment.id,
    postId: comment.postId,
    parentId: comment.parentId,
    num: comment.num,
    body: comment.body,
    likeCount: comment.likeCount,
    liked: comment.liked,
    depth: comment.depth,
    createdAt: comment.createdAt,
    isDeleted: comment.isDeleted,
    isRemoved: comment.isRemoved,
    author: { ...publicAuthor(comment.author), isOp: comment.author.isOp },
    children: comment.children.map(serializeComment),
  };
}

export function serializePostDetail(post: PostDetail): PublicPostDetail {
  return {
    ...serializeFeedPost(post),
    isLocked: post.isLocked,
    comments: post.comments.map(serializeComment),
  };
}

export function serializeLikeResult(result: {
  postId: string;
  likeCount: number;
  liked: boolean;
}): PublicLikeResult {
  return {
    postId: result.postId,
    likeCount: result.likeCount,
    liked: result.liked,
  };
}

export function serializeCommentLikeResult(result: {
  commentId: string;
  likeCount: number;
  liked: boolean;
}): PublicCommentLikeResult {
  return {
    commentId: result.commentId,
    likeCount: result.likeCount,
    liked: result.liked,
  };
}
