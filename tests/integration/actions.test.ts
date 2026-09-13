import { env } from "cloudflare:test";
import jpeg from "jpeg-js";
import { describe, expect, it } from "vitest";

import {
  createComment,
  createPost,
  deleteOwnComment,
  deleteOwnPost,
  editComment,
  editPost,
} from "@/lib/actions";
import { uploadPostImage } from "@/lib/media";
import { getPostDetail } from "@/lib/content";
import { getFeedPosts } from "@/lib/db";
import { AuthError } from "@/lib/session";
import {
  blockUser,
  hidePost,
  reportTarget,
  unblockUser,
  unhidePost,
} from "@/lib/user-actions";
import {
  likeComment,
  likePost,
  unlikeComment,
  unlikePost,
} from "@/lib/likes";

import { getCommentRow, getPostRow, seedUsers } from "./helpers";

describe("content lifecycle (D1)", () => {
  it("creates, edits, and soft-deletes a post", async () => {
    const { authorId } = await seedUsers();

    const created = await createPost({
      userId: authorId,
      title: "Integration post title",
      body: "Body for the integration post",
    });
    expect(created.id).toBeTruthy();

    let row = await getPostRow(created.id);
    expect(row?.title).toBe("Integration post title");
    expect(row?.body).toBe("Body for the integration post");
    expect(row?.is_removed).toBe(0);

    await editPost({
      postId: created.id,
      userId: authorId,
      title: "Edited integration title",
      body: "Edited body",
    });
    row = await getPostRow(created.id);
    expect(row?.title).toBe("Edited integration title");
    expect(row?.body).toBe("Edited body");

    await expect(
      editPost({
        postId: created.id,
        userId: "someone-else",
        title: "Nope",
      })
    ).rejects.toBeInstanceOf(AuthError);

    await deleteOwnPost(created.id, authorId);
    row = await getPostRow(created.id);
    expect(row?.is_removed).toBe(1);
  });

  it("creates nested comments, edits, likes, and deletes them", async () => {
    const { authorId, actorId } = await seedUsers();

    const post = await createPost({
      userId: authorId,
      title: "Comment thread post",
      body: "Root",
    });

    const parent = await createComment({
      userId: authorId,
      postId: post.id,
      body: "Parent comment",
    });
    expect(parent.depth).toBe(0);

    const child = await createComment({
      userId: actorId,
      postId: post.id,
      parentId: parent.id,
      body: "Child reply",
    });
    expect(child.depth).toBe(1);

    let postRow = await getPostRow(post.id);
    expect(postRow?.comment_count).toBe(2);

    await editComment({
      commentId: parent.id,
      userId: authorId,
      body: "Parent comment edited",
    });
    let comment = await getCommentRow(parent.id);
    expect(comment?.body).toBe("Parent comment edited");

    const like = await likeComment(parent.id, actorId);
    expect(like.liked).toBe(true);
    expect(like.likeCount).toBe(1);
    const repeatedLike = await likeComment(parent.id, actorId);
    expect(repeatedLike.likeCount).toBe(1);
    expect((await getCommentRow(parent.id))?.like_count).toBe(1);

    const unlike = await unlikeComment(parent.id, actorId);
    expect(unlike.liked).toBe(false);
    expect(unlike.likeCount).toBe(0);

    await deleteOwnComment(child.id, actorId);
    comment = await getCommentRow(child.id);
    expect(comment?.is_deleted).toBe(1);
    expect(comment?.body).toBe("[deleted]");

    postRow = await getPostRow(post.id);
    expect(postRow?.comment_count).toBe(1);
  });

  it("assigns post likes idempotently", async () => {
    const { authorId, actorId } = await seedUsers();

    const post = await createPost({
      userId: authorId,
      title: "Like target post",
      body: "Please like",
    });

    const liked = await likePost(post.id, actorId);
    expect(liked.liked).toBe(true);
    expect(liked.likeCount).toBe(1);
    expect((await getPostRow(post.id))?.like_count).toBe(1);

    const repeatedLike = await likePost(post.id, actorId);
    expect(repeatedLike.likeCount).toBe(1);
    expect((await getPostRow(post.id))?.like_count).toBe(1);

    const unliked = await unlikePost(post.id, actorId);
    expect(unliked.liked).toBe(false);
    expect(unliked.likeCount).toBe(0);
    expect((await getPostRow(post.id))?.like_count).toBe(0);
  });
  it("returns the same rows for retried post and comment writes", async () => {
    const { authorId } = await seedUsers();
    const postRequestId = crypto.randomUUID();
    const firstPost = await createPost({
      userId: authorId,
      title: "  Retry-safe post  ",
      body: "  The same request must not create two posts.  ",
      requestId: postRequestId,
    });
    const retriedPost = await createPost({
      userId: authorId,
      title: "Retry-safe post",
      body: "The same request must not create two posts.",
      requestId: postRequestId,
    });
    expect(retriedPost).toEqual(firstPost);
    await expect(
      createPost({
        userId: authorId,
        title: "Different retry payload",
        body: "The same request must not create two posts.",
        requestId: postRequestId,
      })
    ).rejects.toMatchObject({
      status: 409,
      message: "Request ID was already used for a different post",
    });

    const postCount = await env.DB
      .prepare(`SELECT COUNT(*) AS count FROM posts WHERE id = ?`)
      .bind(firstPost.id)
      .first<{ count: number }>();
    expect(Number(postCount?.count)).toBe(1);

    const commentRequestId = crypto.randomUUID();
    const firstComment = await createComment({
      userId: authorId,
      postId: firstPost.id,
      body: "This comment is also retry-safe.",
      requestId: commentRequestId,
    });
    const retriedComment = await createComment({
      userId: authorId,
      postId: firstPost.id,
      body: "This comment is also retry-safe.",
      requestId: commentRequestId,
    });
    expect(retriedComment).toEqual(firstComment);
    await expect(
      createComment({
        userId: authorId,
        postId: firstPost.id,
        body: "Different comment retry payload.",
        requestId: commentRequestId,
      })
    ).rejects.toMatchObject({
      status: 409,
      message: "Request ID was already used for a different comment",
    });

    const commentCount = await env.DB
      .prepare(`SELECT COUNT(*) AS count FROM comments WHERE id = ?`)
      .bind(firstComment.id)

      .first<{ count: number }>();
    expect(Number(commentCount?.count)).toBe(1);
  });
});
describe("public feed hardening", () => {
  it("ranks popular posts by canonical engagement with a stable cursor", async () => {
    const { authorId, actorId, adminId } = await seedUsers();
    const recentLow = await createPost({
      userId: authorId,
      title: "Recent low engagement post",
      body: "This post is newer but has no reactions.",
    });
    const popular = await createPost({
      userId: authorId,
      title: "Older popular post",
      body: "This post has canonical likes and a comment.",
    });
    await likePost(popular.id, actorId);
    await likePost(popular.id, adminId);
    await createComment({
      userId: authorId,
      postId: popular.id,
      body: "A real comment increases the engagement rank.",
    });

    const first = await getFeedPosts({
      sort: "popular",
      limit: 1,
    });
    expect(first.posts[0]?.id).toBe(popular.id);
    expect(first.nextCursor).toBeTruthy();

    const second = await getFeedPosts({
      sort: "popular",
      cursor: first.nextCursor,
      limit: 10,
    });
    expect(second.posts.map((post) => post.id)).toContain(recentLow.id);
    expect(second.posts.map((post) => post.id)).not.toContain(popular.id);
  });

  it("uses the same moderation visibility for feed and post detail", async () => {
    const { authorId } = await seedUsers();
    const visible = await createPost({
      userId: authorId,
      title: "Visible public post",
      body: "This post should remain in the public feed.",
    });
    const shadow = await createPost({
      userId: authorId,
      title: "Shadow hidden public post",
      body: "This post is hidden by moderation.",
    });
    await env.DB.prepare(
      `UPDATE posts SET is_shadow_hidden = 1 WHERE id = ?`
    )
      .bind(shadow.id)
      .run();

    const feed = await getFeedPosts({
      sort: "new",
      limit: 20,
    });
    expect(feed.posts.map((post) => post.id)).toContain(visible.id);
    expect(feed.posts.map((post) => post.id)).not.toContain(shadow.id);
    expect(await getPostDetail(shadow.id)).toBeNull();
  });
  it("separates public reads from blocked positive interactions", async () => {
    const { authorId, actorId, adminId } = await seedUsers();
    const post = await createPost({
      userId: authorId,
      title: "Public post remains readable after block",
      body: "Blocking changes interaction policy, not public visibility.",
    });

    await likePost(post.id, actorId);
    await blockUser(actorId, authorId);
    expect(await getPostDetail(post.id, actorId)).toBeTruthy();
    const newPost = await createPost({
      userId: authorId,
      title: "A new post after the block",
      body: "A new positive interaction must be denied.",
    });
    await expect(likePost(newPost.id, actorId)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      createComment({
        userId: actorId,
        postId: post.id,
        body: "This new comment must be denied.",
      })
    ).rejects.toMatchObject({ status: 403 });
    await expect(unlikePost(post.id, actorId)).resolves.toMatchObject({
      liked: false,
    });

    const parent = await createComment({
      userId: adminId,
      postId: post.id,
      body: "Parent comment for bilateral reply policy.",
    });
    await likeComment(parent.id, actorId);
    await blockUser(actorId, adminId);
    const secondComment = await createComment({
      userId: adminId,
      postId: post.id,
      body: "A second comment tests a new blocked like.",
    });
    await expect(likeComment(secondComment.id, actorId)).rejects.toMatchObject({
      status: 403,
    });
    await expect(unlikeComment(parent.id, actorId)).resolves.toMatchObject({
      liked: false,
    });
    await expect(
      createComment({
        userId: actorId,
        postId: post.id,
        parentId: parent.id,
        body: "This reply must be denied by the parent block.",
      })
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("user actions (hide / block / report)", () => {
  it("hides a post from the viewer feed", async () => {
    const { authorId, actorId } = await seedUsers();

    const post = await createPost({
      userId: authorId,
      title: "Hide me from feeds",
      body: "Secret",
    });

    const before = await getFeedPosts({
      viewerUserId: actorId,
      sort: "new",
      limit: 10,
    });
    expect(before.posts.some((p) => p.id === post.id)).toBe(true);

    await hidePost(actorId, post.id);
    const hidden = await env.DB.prepare(
      `SELECT 1 AS ok FROM hidden_posts WHERE user_id = ? AND post_id = ?`
    )
      .bind(actorId, post.id)
      .first();
    expect(hidden).toBeTruthy();

    const after = await getFeedPosts({
      viewerUserId: actorId,
      sort: "new",
      limit: 10,
    });
    expect(after.posts.some((p) => p.id === post.id)).toBe(false);

    await unhidePost(actorId, post.id);
    const restored = await getFeedPosts({
      viewerUserId: actorId,
      sort: "new",
      limit: 10,
    });
    expect(restored.posts.some((p) => p.id === post.id)).toBe(true);
  });

  it("blocks a user and filters their posts from the feed", async () => {
    const { authorId, actorId } = await seedUsers();

    const post = await createPost({
      userId: authorId,
      title: "Block author post",
      body: "Bye",
    });

    await blockUser(actorId, authorId);
    const block = await env.DB.prepare(
      `SELECT 1 AS ok FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?`
    )
      .bind(actorId, authorId)
      .first();
    expect(block).toBeTruthy();

    const feed = await getFeedPosts({
      viewerUserId: actorId,
      sort: "new",
      limit: 10,
    });
    expect(feed.posts.some((p) => p.id === post.id)).toBe(false);

    await unblockUser(actorId, authorId);
    const unblocked = await getFeedPosts({
      viewerUserId: actorId,
      sort: "new",
      limit: 10,
    });
    expect(unblocked.posts.some((p) => p.id === post.id)).toBe(true);
  });

  it("reports a post once and rejects duplicates", async () => {
    const { authorId, actorId } = await seedUsers();

    const post = await createPost({
      userId: authorId,
      title: "Reportable post",
      body: "Spammy",
    });

    const result = await reportTarget({
      reporterId: actorId,
      targetType: "post",
      targetId: post.id,
      reason: "spam",
      details: "Looks like spam",
    });
    expect(result.reported).toBe(true);

    await expect(
      reportTarget({
        reporterId: actorId,
        targetType: "post",
        targetId: post.id,
        reason: "spam",
      })
    ).rejects.toBeInstanceOf(AuthError);
  });
});

describe("validation edges", () => {
  it("rejects short titles and self-block", async () => {
    const { authorId } = await seedUsers();

    await expect(
      createPost({
        userId: authorId,
        title: "ab",
      })
    ).rejects.toBeInstanceOf(AuthError);

    await expect(blockUser(authorId, authorId)).rejects.toBeInstanceOf(
      AuthError
    );
  });
  it("rejects oversized post fields", async () => {
    const { authorId } = await seedUsers();

    await expect(
      createPost({
        userId: authorId,
        title: "Valid title",
        body: "x".repeat(20_001),
      })
    ).rejects.toMatchObject({ status: 400 });

    await expect(
      createPost({
        userId: authorId,
        title: "Valid title",
        url: `https://${"x".repeat(2_042)}`,
      })
    ).rejects.toMatchObject({ status: 400 });
  });
  it("requires an existing media object owned by the poster", async () => {
    const { authorId, actorId } = await seedUsers();
    const source = jpeg.encode({
      width: 8,
      height: 8,
      data: Buffer.alloc(8 * 8 * 4, 120),
    });
    const uploaded = await uploadPostImage({
      userId: authorId,
      file: new File([source.data], "test.jpg", { type: "image/jpeg" }),
    });
    await expect(
      createPost({
        userId: authorId,
        title: "Missing image",
        mediaKey: "media/missing-1.jpg",
      })
    ).rejects.toMatchObject({ status: 400 });

    await expect(
      createPost({
        userId: actorId,
        title: "Someone else's image",
        mediaKey: uploaded.mediaKey,
      })
    ).rejects.toMatchObject({ status: 400 });

    const post = await createPost({
      userId: authorId,
      title: "Owned image",
      mediaKey: uploaded.mediaKey,
    });
    expect(post.id).toBeTruthy();
    await editPost({
      postId: post.id,
      userId: authorId,
      title: "Edited image title",
    });
    const imageRow = await env.DB
      .prepare(`SELECT media_key, body, url FROM posts WHERE id = ?`)
      .bind(post.id)
      .first<{
        media_key: string | null;
        body: string | null;
        url: string | null;
      }>();
    expect(imageRow).toEqual({
      media_key: uploaded.mediaKey,
      body: null,
      url: null,
    });

    await expect(
      editPost({
        postId: post.id,
        userId: authorId,
        url: "https://example.com/replace-image",
      })
    ).rejects.toMatchObject({ status: 400 });
    const linkPost = await createPost({
      userId: authorId,
      title: "Owned link",
      url: "https://example.com/original",
    });
    await expect(
      editPost({
        postId: linkPost.id,
        userId: authorId,
        url: null,
      })
    ).rejects.toMatchObject({ status: 400 });
  });
});
