import { describe, expect, it } from "vitest";

import { anonTag } from "@/lib/anon-tag";

describe("anonTag", () => {
  it("is deterministic for the same post + author", () => {
    expect(anonTag("postA", "user1")).toBe(anonTag("postA", "user1"));
  });

  it("differs across posts for the same author", () => {
    expect(anonTag("postA", "user1")).not.toBe(anonTag("postB", "user1"));
  });

  it("differs across authors in the same post", () => {
    expect(anonTag("postA", "user1")).not.toBe(anonTag("postA", "user2"));
  });

  it("is a 4-char lowercase alphanumeric tag", () => {
    for (const [p, u] of [
      ["a", "b"],
      ["post1", "user-very-long-id-123"],
      ["한글포스트", "유저"],
    ]) {
      expect(anonTag(p, u)).toMatch(/^[0-9a-z]{4}$/);
    }
  });

  it("reveals nothing about the raw ids", () => {
    const tag = anonTag("postA", "secret-user-id");
    expect(tag).not.toContain("user");
    expect(tag).not.toContain("secret");
  });
});
