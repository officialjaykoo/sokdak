import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const mockReadPost = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/messages/[roomId]/read/route", () => ({
  POST: mockReadPost,
}));

import { dispatchInternalApi, ROUTES } from "@/lib/internal-api/dispatch";

const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
] as const;

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(testsDir, "../../src/app/api");

function listRouteFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listRouteFiles(full));
    else if (entry.name === "route.ts") files.push(full);
  }
  return files;
}

function routePatternFor(file: string): string {
  const rel = path.relative(apiRoot, path.dirname(file));
  const segments = rel
    .split(path.sep)
    .filter(Boolean)
    .map((segment) => {
      const catchAll = segment.match(/^\[\.\.\.(.+)\]$/);
      if (catchAll) return `*${catchAll[1]}`;
      const dynamic = segment.match(/^\[(.+)\]$/);
      if (dynamic) return `:${dynamic[1]}`;
      return segment;
    });
  return `/api/${segments.join("/")}`;
}

function exportedMethods(file: string): string[] {
  const source = readFileSync(file, "utf8");
  return HTTP_METHODS.filter((method) =>
    new RegExp(
      `export\\s+(async\\s+)?function\\s+${method}\\b|export\\s+const\\s+${method}\\b`
    ).test(source)
  );
}

describe("internal API dispatch", () => {
  it("routes POST /api/messages/:roomId/read to the read handler", async () => {
    mockReadPost.mockResolvedValue(Response.json({ ok: true }));

    const response = await dispatchInternalApi({
      request: new NextRequest("http://localhost/i/api", { method: "POST" }),
      method: "POST",
      path: "/api/messages/room-1/read",
      query: "",
      body: new TextEncoder().encode(JSON.stringify({ messageId: "m-1" })),
      contentType: "application/json",
    });

    expect(response.status).toBe(200);
    expect(mockReadPost).toHaveBeenCalledTimes(1);
    const context = mockReadPost.mock.calls[0]![1] as {
      params: Promise<Record<string, string>>;
    };
    await expect(context.params).resolves.toEqual({ roomId: "room-1" });
  });

  it("returns 404 for unregistered paths", async () => {
    const response = await dispatchInternalApi({
      request: new NextRequest("http://localhost/i/api"),
      method: "GET",
      path: "/api/not-a-route",
      query: "",
      body: new Uint8Array(),
    });

    expect(response.status).toBe(404);
  });
});

describe("internal API route coverage", () => {
  it("registers every API route file in the dispatch table", () => {
    const registered = new Set(ROUTES.map((route) => route.pattern));
    const missing = listRouteFiles(apiRoot)
      .map(routePatternFor)
      .filter((pattern) => !registered.has(pattern));
    expect(missing).toEqual([]);
  });

  it("maps every registered pattern to an existing route file", () => {
    const existing = new Set(listRouteFiles(apiRoot).map(routePatternFor));
    const stale = ROUTES.map((route) => route.pattern).filter(
      (pattern) => !existing.has(pattern)
    );
    expect(stale).toEqual([]);
  });

  it("registers every exported HTTP method for each route file", () => {
    const table = new Map(
      ROUTES.map((route) => [route.pattern, new Set(route.methods)])
    );
    const gaps: string[] = [];
    for (const file of listRouteFiles(apiRoot)) {
      const pattern = routePatternFor(file);
      const registered = table.get(pattern);
      if (!registered) continue;
      for (const method of exportedMethods(file)) {
        if (!registered.has(method)) gaps.push(`${method} ${pattern}`);
      }
    }
    expect(gaps).toEqual([]);
  });
});
