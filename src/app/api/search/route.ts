import { NextRequest, NextResponse } from "next/server";

import { enforceExpensiveIpRateLimit } from "@/lib/rate-limit";
import { clientIpFromHeaders } from "@/lib/security/challenge";
import { searchAll } from "@/lib/search";
import { AuthError, getSession, jsonAuthError } from "@/lib/session";
import { jsonLocalizedError } from "@/lib/public-error";

export async function GET(request: NextRequest) {
  try {
    const ip = clientIpFromHeaders(request.headers);
    await enforceExpensiveIpRateLimit(ip, "search:burst");

    const q = request.nextUrl.searchParams.get("q") ?? "";
    const suggest = request.nextUrl.searchParams.get("suggest") === "1";

    const session = await getSession();
    const results = await searchAll(
      q,
      suggest ? { posts: 5 } : undefined,
      session?.user?.id ?? null
    );
    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof AuthError) {
      return await jsonAuthError(error);
    }
    console.error("GET /api/search failed", error);
    return await jsonLocalizedError("Search failed", 500);
  }
}
