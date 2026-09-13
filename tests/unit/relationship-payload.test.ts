import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  AuthError,
  mockBlockUser,
  mockGetDb,
  mockGetProfileRelation,
  mockMuteUser,
  mockReadApiJson,
  mockRequireSession,
  mockUnblockUser,
} = vi.hoisted(() => {
  class TestAuthError extends Error {
    status: number;

    constructor(message: string, status = 401) {
      super(message);
      this.name = "AuthError";
      this.status = status;
    }
  }

  return {
    AuthError: TestAuthError,
    mockBlockUser: vi.fn(),
    mockGetDb: vi.fn(),
    mockGetProfileRelation: vi.fn(),
    mockMuteUser: vi.fn(),
    mockReadApiJson: vi.fn(),
    mockRequireSession: vi.fn(),
    mockUnblockUser: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ getDb: mockGetDb }));
vi.mock("@/lib/messages", () => ({
  cancelChatRequest: vi.fn(),
  respondToChatRequest: vi.fn(),
}));
vi.mock("@/lib/public-error", () => ({
  jsonLocalizedError: vi.fn(async (message: string, status: number) =>
    Response.json({ error: message }, { status })
  ),
}));
vi.mock("@/lib/security/guard", () => ({
  readApiJson: mockReadApiJson,
}));
vi.mock("@/lib/session", () => ({
  AuthError,
  jsonAuthError: vi.fn(async (error: InstanceType<typeof AuthError>) =>
    Response.json({ error: error.message }, { status: error.status })
  ),
  requireSession: mockRequireSession,
}));
vi.mock("@/lib/user-actions", () => ({
  blockUser: mockBlockUser,
  getProfileRelation: mockGetProfileRelation,
  muteUser: mockMuteUser,
  reportTarget: vi.fn(),
  unblockUser: mockUnblockUser,
  unmuteUser: vi.fn(),
}));

import { POST as chatRequestPost } from "@/app/api/messages/requests/[id]/route";
import {
  POST as blockPost,
  DELETE as blockDelete,
} from "@/app/api/me/blocks/[userId]/route";
import { POST as blockAuthorPost } from "@/app/api/posts/[id]/block-author/route";
import { POST as userPost } from "@/app/api/users/[username]/route";

function request(path: string) {
  return new NextRequest(`http://localhost${path}`, { method: "POST" });
}

const baseRelationship = {
  blockState: "none",
  muteState: "none",
  canViewProfile: true,
  canInteract: true,
  canMessage: true,
  isSelf: false,
};

describe("relationship API payload validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ user: { id: "viewer" } });
    mockGetDb.mockResolvedValue({
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({ id: "target", author_id: "target" }),
        })),
      })),
    });
  });

  it.each([
    ["users array body", userPost, "/api/users/target", [], { params: Promise.resolve({ username: "target" }) }],
    [
      "users null reason",
      userPost,
      "/api/users/target",
      { action: "report", reason: null },
      { params: Promise.resolve({ username: "target" }) },
    ],
    [
      "users object details",
      userPost,
      "/api/users/target",
      { action: "report", reason: "spam", details: {} },
      { params: Promise.resolve({ username: "target" }) },
    ],
    [
      "chat request array action",
      chatRequestPost,
      "/api/messages/requests/request-1",
      { action: [] },
      { params: Promise.resolve({ id: "request-1" }) },
    ],
  ] as const)("returns 400 for %s", async (_label, handler, path, body, context) => {
    mockReadApiJson.mockResolvedValue(body);
    const response = await handler(
      request(path),
      context as never
    );
    expect(response.status).toBe(400);
  });

  it("returns the canonical relationship projection after a user action", async () => {
    const relationship = { ...baseRelationship, muteState: "muted" };
    mockReadApiJson.mockResolvedValue({ action: "mute" });
    mockMuteUser.mockResolvedValue({ muteState: "muted" });
    mockGetProfileRelation.mockResolvedValue(relationship);

    const response = await userPost(request("/api/users/target"), {
      params: Promise.resolve({ username: "target" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      muteState: "muted",
      relationship,
    });
    expect(mockGetProfileRelation).toHaveBeenCalledWith("viewer", "target");
  });

  it("uses the ID block endpoint and returns the post-mutation projection", async () => {
    const relationship = {
      ...baseRelationship,
      blockState: "blocked_by_me",
      canInteract: false,
      canMessage: false,
    };
    mockBlockUser.mockResolvedValue({ blocked: true });
    mockGetProfileRelation.mockResolvedValue(relationship);

    const postResponse = await blockPost(
      request("/api/me/blocks/target"),
      { params: Promise.resolve({ userId: "target" }) }
    );
    expect(postResponse.status).toBe(200);
    expect(await postResponse.json()).toMatchObject({ blocked: true, relationship });

    const unblockedRelationship = { ...relationship, blockState: "none", canInteract: true };
    mockUnblockUser.mockResolvedValue({ blocked: false });
    mockGetProfileRelation.mockResolvedValue(unblockedRelationship);
    const deleteResponse = await blockDelete(
      request("/api/me/blocks/target"),
      { params: Promise.resolve({ userId: "target" }) }
    );
    expect(deleteResponse.status).toBe(200);
    expect(await deleteResponse.json()).toMatchObject({
      blocked: false,
      relationship: unblockedRelationship,
    });
  });

  it("resolves post authors to the canonical ID block endpoint", async () => {
    mockBlockUser.mockResolvedValue({ blocked: true });
    mockGetProfileRelation.mockResolvedValue({
      ...baseRelationship,
      blockState: "blocked_by_me",
      canInteract: false,
      canMessage: false,
    });

    const response = await blockAuthorPost(
      request("/api/posts/post-1/block-author"),
      { params: Promise.resolve({ id: "post-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockBlockUser).toHaveBeenCalledWith("viewer", "target");
    expect(await response.json()).toMatchObject({ blocked: true });
  });

  it("rejects username-based block mutations", async () => {
    mockReadApiJson.mockResolvedValue({ action: "block" });

    const response = await userPost(request("/api/users/target"), {
      params: Promise.resolve({ username: "target" }),
    });

    expect(response.status).toBe(400);
    expect(mockBlockUser).not.toHaveBeenCalled();
  });
});
