import { describe, expect, it } from "vitest";

import {
  parseCommentPayload,
  parseLikePayload,
} from "@/lib/content-payload";

const malformed = [null, [], "body", 42, {}];

describe("public content payload parsers", () => {
  it.each(malformed)("rejects malformed like payload %#", (value) => {
    expect(() => parseLikePayload(value)).toThrowError(
      expect.objectContaining({ status: 400 })
    );
  });

  it("rejects unknown like actions and wrong field types", () => {
    expect(() => parseLikePayload({ action: "vote" })).toThrowError(
      expect.objectContaining({ status: 400 })
    );
    expect(() => parseCommentPayload({ body: 123 })).toThrowError(
      expect.objectContaining({ status: 400 })
    );
    expect(() => parseCommentPayload(null)).toThrowError(
      expect.objectContaining({ status: 400 })
    );
    expect(() => parseCommentPayload({ body: "ok", requestId: 1 })).toThrowError(
      expect.objectContaining({ status: 400 })
    );
  });

  it("preserves valid optional fields", () => {
    expect(
      parseCommentPayload({
        body: "A valid comment",
        parentId: null,
        requestId: "request-1",
      })
    ).toEqual({
      body: "A valid comment",
      parentId: null,
      requestId: "request-1",
    });
  });
});
