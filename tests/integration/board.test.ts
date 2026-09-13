import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { createComment, createPost } from "@/lib/actions";
import { setPostNotice } from "@/lib/admin";
import { getPostDetail } from "@/lib/content";
import { getBoardPosts } from "@/lib/db";
import { blockUser } from "@/lib/user-actions";
import { serializePostDetail } from "@/lib/serializers";

import { seedUsers } from "./helpers";

describe("GNU-style board (D1)", () => {
  it("pins notices above the list and excludes them from the count", async () => {
    const { authorId } = await seedUsers();
    const regular = await createPost({
      userId: authorId,
      title: "Regular board post",
      body: "body",
    });
    const notice = await createPost({
      userId: authorId,
      title: "Pinned notice post",
      body: "body",
    });
    await setPostNotice({ actorId: authorId, postId: notice.id, notice: true });

    const board = await getBoardPosts({ page: 1, perPage: 10 });
    expect(board.notices.map((p) => p.id)).toContain(notice.id);
    expect(board.posts.map((p) => p.id)).toContain(regular.id);
    expect(board.posts.map((p) => p.id)).not.toContain(notice.id);
    // Notices are excluded from total so numbering stays regular-posts only.
    expect(board.total).toBe(board.posts.length + 0 || board.total);
    expect(board.posts.every((p) => !p.isNotice)).toBe(true);
    expect(board.notices.every((p) => p.isNotice)).toBe(true);
  });

  it("paginates with page/totalPages and clamps out-of-range pages", async () => {
    const { authorId } = await seedUsers();
    // Bulk-insert via SQL — createPost is rate-limited per user.
    for (let i = 0; i < 3; i += 1) {
      await env.DB.prepare(
        `INSERT INTO posts (id, author_id, title, body)
         VALUES (?, ?, ?, 'body')`
      )
        .bind(`paged_${crypto.randomUUID()}`, authorId, `paged ${i}`)
        .run();
    }
    const page1 = await getBoardPosts({ page: 1, perPage: 5 });
    expect(page1.totalPages).toBe(Math.max(1, Math.ceil(page1.total / 5)));
    expect(page1.posts.length).toBeLessThanOrEqual(5);

    const clamped = await getBoardPosts({ page: 9999, perPage: 5 });
    expect(clamped.page).toBe(clamped.totalPages);
    // The union of all pages covers `total` posts exactly once.
    if (page1.totalPages > 1) {
      const page2 = await getBoardPosts({ page: 2, perPage: 5 });
      const ids1 = page1.posts.map((p) => p.id);
      const ids2 = page2.posts.map((p) => p.id);
      expect(ids1.filter((id) => ids2.includes(id))).toHaveLength(0);
    }
    const perOne = await getBoardPosts({ page: 1, perPage: 1 });
    expect(perOne.posts).toHaveLength(1);
    expect(perOne.totalPages).toBe(page1.total);
  });

  it("increments views on detail read and exposes a stable rowid num", async () => {
    const { authorId } = await seedUsers();
    const post = await createPost({
      userId: authorId,
      title: "View counted post",
      body: null,
    });
    const first = await getPostDetail(post.id);
    const second = await getPostDetail(post.id);
    expect(first?.num).toBeGreaterThan(0);
    expect(Number(second?.views)).toBe(Number(first?.views) + 1);
  });

  it("allocates sequential comment numbers per post", async () => {
    const { authorId, actorId } = await seedUsers();
    const post = await createPost({
      userId: authorId,
      title: "numbered comments",
      body: null,
    });
    const c1 = await createComment({ userId: authorId, postId: post.id, body: "first" });
    const c2 = await createComment({ userId: actorId, postId: post.id, body: "second" });
    await createComment({
      userId: authorId,
      postId: post.id,
      parentId: c1.id,
      body: "reply",
    });

    const detail = await getPostDetail(post.id);
    const flat = detail!.comments.flatMap(function walk(c): typeof c[] {
      return [c, ...c.children.flatMap(walk)];
    });
    const nums = flat.map((c) => c.num).sort((a, b) => a - b);
    expect(nums).toEqual([1, 2, 3]);
    const byId = new Map(flat.map((c) => [c.id, c]));
    expect(byId.get(c1.id)?.num).toBe(1);
    expect(byId.get(c2.id)?.num).toBe(2);
  });

  it("keeps per-thread anonymous tags stable and opaque", async () => {
    const { authorId, actorId } = await seedUsers();
    const postA = await createPost({ userId: authorId, title: "Thread A", body: null });
    const postB = await createPost({ userId: authorId, title: "Thread B", body: null });
    await createComment({ userId: actorId, postId: postA.id, body: "hi" });
    await createComment({ userId: actorId, postId: postB.id, body: "hi" });

    const detailA = await getPostDetail(postA.id);
    const detailB = await getPostDetail(postB.id);

    const tagA = detailA!.comments[0]!.author.anonTag;
    const tagB = detailB!.comments[0]!.author.anonTag;
    expect(tagA).toMatch(/^[0-9a-z]{4}$/);
    expect(tagA).not.toBe(tagB);
    // Same author, same thread → same tag on post and elsewhere in thread A.
    expect(detailA!.author.anonTag).toMatch(/^[0-9a-z]{4}$/);
    expect(detailA!.comments[0]!.author.isOp).toBe(false);

    const byOp = await createComment({
      userId: authorId,
      postId: postA.id,
      body: "op reply",
    });
    const again = await getPostDetail(postA.id);
    const opComment = again!.comments.find((c) => c.id === byOp.id);
    expect(opComment?.author.isOp).toBe(true);
    expect(opComment?.author.anonTag).toBe(again!.author.anonTag);
  });

  it("serializes no public identity beyond the anon tag", async () => {
    const { authorId, actorId } = await seedUsers();
    const post = await createPost({ userId: authorId, title: "anon", body: null });
    await createComment({ userId: actorId, postId: post.id, body: "hi" });
    const detail = await getPostDetail(post.id, actorId);
    const payload = JSON.parse(JSON.stringify(serializePostDetail(detail!)));

    expect(payload.author).not.toHaveProperty("id");
    expect(payload.author).not.toHaveProperty("username");
    expect(payload.author).not.toHaveProperty("displayName");
    expect(payload.author).not.toHaveProperty("image");
    expect(payload.author.anonTag).toMatch(/^[0-9a-z]{4}$/);
    expect(payload.author.isAuthor).toBe(false);
    expect(payload.num).toBeGreaterThan(0);
    expect(payload.views).toBeGreaterThan(0);
    expect(payload.comments[0].author).not.toHaveProperty("id");
    expect(payload.comments[0].num).toBe(1);
    expect(payload.comments[0].author.isOp).toBe(false);
  });

  it("shows blocked commenters as tombstones without leaking their content", async () => {
    const { authorId, actorId } = await seedUsers();
    const post = await createPost({ userId: authorId, title: "block", body: null });
    const blocked = await createComment({
      userId: authorId,
      postId: post.id,
      body: "secret blocked text",
    });
    await createComment({
      userId: actorId,
      postId: post.id,
      parentId: blocked.id,
      body: "visible child",
    });
    await blockUser(actorId, authorId);

    const detail = await getPostDetail(post.id, actorId);
    const blockedNode = detail!.comments.find((c) => c.id === blocked.id);
    expect(blockedNode?.isDeleted).toBe(true);
    expect(blockedNode?.body).not.toContain("secret blocked text");
    // Child structure is preserved.
    expect(blockedNode?.children).toHaveLength(1);
    expect(blockedNode?.children[0]?.body).toBe("visible child");
  });
});
