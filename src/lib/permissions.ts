import { AuthError } from "@/lib/session";

export type SessionUser = {
  id: string;
  name?: string | null;
  username?: string | null;
  role?: string | null;
  status?: string | null;
};

export async function requireActiveUser(user: SessionUser) {
  if (user.status === "banned") {
    throw new AuthError("This account can't do that", 403);
  }
  return user;
}

export async function requireAdmin(user: SessionUser) {
  await requireActiveUser(user);
  if (user.role !== "admin") {
    throw new AuthError("You don't have permission to do that", 403);
  }
  return user;
}

export async function requireModeratorOrAdmin(user: SessionUser) {
  await requireActiveUser(user);
  if (user.role === "admin" || user.role === "moderator") {
    return user;
  }
  throw new AuthError("You don't have permission to do that", 403);
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}


