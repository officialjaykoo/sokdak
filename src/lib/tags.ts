export type AccountTagId = "admin" | "moderator";

export type AccountTag = {
  id: AccountTagId;
  label: string;
};

/** Visible role tags; permissions are enforced separately. */
export function resolveAccountTags(input: {
  role?: string | null;
}): AccountTag[] {
  const role = input.role ?? "user";
  const tags: AccountTag[] = [];

  if (role === "admin") {
    tags.push({ id: "admin", label: "Admin" });
  }

  if (role === "moderator") {
    tags.push({ id: "moderator", label: "Mod" });
  }

  return tags;
}
