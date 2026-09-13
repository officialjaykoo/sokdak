import type { LikeMutation } from "@/lib/types";
import { AuthError } from "@/lib/session";

function asRecord(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AuthError(message, 400);
  }
  return value as Record<string, unknown>;
}

function requiredString(
  record: Record<string, unknown>,
  field: string,
  message: string
): string {
  const value = record[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AuthError(message, 400);
  }
  return value;
}

function optionalString(
  record: Record<string, unknown>,
  field: string,
  message: string
): string | null | undefined {
  if (!(field in record)) return undefined;
  const value = record[field];
  if (value === null) return null;
  if (typeof value !== "string") throw new AuthError(message, 400);
  return value;
}

export type LikePayload = { action: LikeMutation };

export function parseLikePayload(value: unknown): LikePayload {
  const message = "Invalid like payload";
  const record = asRecord(value, message);
  const action = record.action;
  if (action !== "like" && action !== "unlike") {
    throw new AuthError(message, 400);
  }
  return { action };
}

export type CommentPayload = {
  body: string;
  parentId?: string | null;
  requestId?: string | null;
};

export function parseCommentPayload(value: unknown): CommentPayload {
  const message = "Invalid comment payload";
  const record = asRecord(value, message);
  return {
    body: requiredString(record, "body", message),
    parentId: optionalString(record, "parentId", message),
    requestId: optionalString(record, "requestId", message),
  };
}


