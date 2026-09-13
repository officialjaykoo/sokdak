import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { jsonLocalizedError } from "@/lib/public-error";
import { blockUser } from "@/lib/user-actions";
import { AuthError, jsonAuthError, requireSession } from "@/lib/session";

/**
 * Anonymous-board commenter block: resolves the comment's author internally
 * and blocks them. The client never sees the target's identity.
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await context.params;
    const db = await getDb();
    const comment = await db
      .prepare(`SELECT author_id FROM comments WHERE id = ?`)
      .bind(id)
      .first<{ author_id: string }>();
    if (!comment) return await jsonLocalizedError("Comment not found", 404);

    const result = await blockUser(session.user.id, comment.author_id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) return await jsonAuthError(error);
    console.error("POST /api/comments/[id]/block-author failed", error);
    return await jsonLocalizedError("Action failed", 500);
  }
}
