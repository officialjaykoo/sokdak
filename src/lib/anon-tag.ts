/**
 * jard/DC-style anonymous author tags.
 *
 * Public author identity is `익명(xxxx)` — a deterministic 4-character tag
 * derived from (postId, authorId). The same author gets the same tag inside
 * one thread and a different tag in other threads, so a thread stays
 * readable while public identity does not leak across posts.
 *
 * This is a display pseudonym, not a security token: the tag reveals nothing
 * about the username, and `user.id` never reaches the public payload.
 */

const ANON_TAG_CHARS = "0123456789abcdefghijklmnopqrstuvwxyz";
const ANON_TAG_LENGTH = 4;

/** FNV-1a 32-bit — small, synchronous, stable across workers. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Deterministic per-thread anonymous tag, e.g. "ab12". */
export function anonTag(postId: string, authorId: string): string {
  let value = fnv1a(`${postId}:${authorId}`);
  let tag = "";
  for (let i = 0; i < ANON_TAG_LENGTH; i += 1) {
    tag = ANON_TAG_CHARS[value % ANON_TAG_CHARS.length] + tag;
    value = Math.floor(value / ANON_TAG_CHARS.length);
  }
  return tag;
}
