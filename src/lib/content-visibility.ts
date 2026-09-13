/**
 * Canonical public post predicate for the given posts table alias.
 */
export function publicPostVisibilitySql(postAlias = "p"): string {
  return `${postAlias}.is_removed = 0 AND ${postAlias}.is_shadow_hidden = 0`;
}
