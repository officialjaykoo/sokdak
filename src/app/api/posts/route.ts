import { NextRequest, NextResponse } from "next/server";

import { createPost } from "@/lib/actions";
import { HUMAN_COOKIE, openHumanToken } from "@/lib/security/human-cookie";
import { parseCreatePostPayload } from "@/lib/post-payload";
import { getTunnelContext } from "@/lib/security/tunnel-context";
import {
  getFeedPosts,
  InvalidFeedCursorError,
  parsePopularWindow,
  DEFAULT_POPULAR_WINDOW,
  type FeedSort,
  type PopularWindow,
} from "@/lib/db";
import { serializeFeed } from "@/lib/serializers";
import {
  getSession,
  AuthError,
  jsonAuthError,
  requireSession,
} from "@/lib/session";
import { jsonLocalizedError } from "@/lib/public-error";
import { requestIdFromHeaders } from "@/lib/idempotency";
import { requireBotAttestation } from "@/lib/security/bot-guard";
import { readApiJson } from "@/lib/security/guard";
import { requireActiveUser } from "@/lib/permissions";

const SORTS = new Set<FeedSort>(["new", "popular"]);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const cursor = searchParams.get("cursor");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    const windowParam = searchParams.get("window");
    const parsedWindow = parsePopularWindow(windowParam);
    if (windowParam && !parsedWindow) {
      return await jsonLocalizedError("Invalid popular window", 400);
    }
    const window: PopularWindow =
      parsedWindow ?? DEFAULT_POPULAR_WINDOW;
    const sortParam = searchParams.get("sort") ?? "new";
    if (limitParam && Number.isNaN(limit)) {
      return await jsonLocalizedError("Invalid limit", 400);
    }
    if (!SORTS.has(sortParam as FeedSort)) {
      return await jsonLocalizedError("Invalid sort", 400);
    }

    const session = await getSession();
    const viewerUserId = session?.user?.id ?? null;
    const feed = await getFeedPosts({
      cursor,
      limit,
      viewerUserId,
      sort: sortParam as FeedSort,
      window,
    });
    return NextResponse.json(
      serializeFeed({
        posts: feed.posts.map((post) => ({ ...post, kind: "post" as const })),
        nextCursor: feed.nextCursor,
        hasMore: feed.hasMore,
      }),
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    if (error instanceof InvalidFeedCursorError) {
      return await jsonLocalizedError("Invalid cursor", 400);
    }
    console.error("GET /api/posts failed", error);
    return await jsonLocalizedError("Failed to load feed", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const rawBody = requireBotAttestation(await readApiJson(request));
    const body = parseCreatePostPayload(rawBody);
    if (getTunnelContext()?.verified) {
      const humanToken = request.cookies.get(HUMAN_COOKIE)?.value ?? null;
      if (!(await openHumanToken(humanToken))) {
        throw new AuthError("Could not verify request", 403);
      }
    }

    const user = session.user as {
      id: string;
      status?: string | null;
      username?: string | null;
      name?: string | null;
    };

    await requireActiveUser(user);

    const result = await createPost({
      userId: user.id,
      userStatus: user.status,
      title: body.title,
      body: body.body,
      url: body.url,
      mediaKey: body.mediaKey,
      requestId: body.requestId ?? requestIdFromHeaders(request.headers),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return await jsonAuthError(error);
    }
    console.error("POST /api/posts failed", error);
    return await jsonLocalizedError("Failed to create post", 500);
  }
}
