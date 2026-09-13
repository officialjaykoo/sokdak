import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { jsonLocalizedError } from "@/lib/public-error";
import { muteUser } from "@/lib/user-actions";
import { AuthError, jsonAuthError, requireSession } from "@/lib/session";

/**
 * Anonymous-board author mute: resolves the post's author internally and
 * mutes them. The client never sees the target's identity; unmute happens
 * from the privacy settings muted list.
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await context.params;
    const db = await getDb();
    const post = await db
      .prepare(`SELECT author_id FROM posts WHERE id = ? AND is_removed = 0`)
      .bind(id)
      .first<{ author_id: string }>();
    if (!post) return await jsonLocalizedError("Post not found", 404);

    const result = await muteUser(session.user.id, post.author_id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) return await jsonAuthError(error);
    console.error("POST /api/posts/[id]/mute-author failed", error);
    return await jsonLocalizedError("Action failed", 500);
  }
}
