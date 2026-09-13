import { getDb } from "@/lib/db";
import type { AllowDms } from "@/lib/user-settings";

export type DmRelationship = {
  blocked: boolean;
  allowDms: AllowDms;
  directAllowed: boolean;
  requestAllowed: boolean;
  activeEstablishedRoom: boolean;
  canMessage: boolean;
  messageMode: "existing" | "request" | "none";
};

function pairKey(firstUserId: string, secondUserId: string): string {
  return [firstUserId, secondUserId].sort().join(":");
}

function normalizeAllowDms(value: unknown): AllowDms {
  if (value === "followers" || value === "nobody") return value;
  return "anyone";
}

/**
 * Evaluate the complete DM relationship policy for one sender/recipient pair.
 * Established rooms keep working; new conversations start as requests when
 * the recipient accepts DMs from anyone. "followers" is a legacy stored value
 * that no longer grants request access (the follow graph was removed).
 */
export async function getDmRelationship(input: {
  senderId: string;
  recipientId: string;
}): Promise<DmRelationship> {
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT
         EXISTS (
           SELECT 1 FROM user_blocks
           WHERE (blocker_id = ? AND blocked_id = ?)
              OR (blocker_id = ? AND blocked_id = ?)
         ) AS blocked,
         EXISTS (
           SELECT 1 FROM chat_rooms r
           WHERE r.pair_key = ?
             AND EXISTS (
               SELECT 1 FROM chat_room_members member
               WHERE member.room_id = r.id
                 AND member.user_id = ?
                 AND member.membership_status = 'active'
             )
             AND EXISTS (
               SELECT 1 FROM chat_room_members member
               WHERE member.room_id = r.id
                 AND member.user_id = ?
                 AND member.membership_status = 'active'
             )
         ) AS active_established_room,
         COALESCE(
           (SELECT allowDms FROM "user" WHERE id = ?),
           'anyone'
         ) AS allow_dms`
    )
    .bind(
      input.senderId,
      input.recipientId,
      input.recipientId,
      input.senderId,
      pairKey(input.senderId, input.recipientId),
      input.senderId,
      input.recipientId,
      input.recipientId
    )
    .first<{
      blocked: number;
      active_established_room: number;
      allow_dms: string | null;
    }>();

  const blocked = Boolean(row?.blocked);
  const activeEstablishedRoom = Boolean(row?.active_established_room);
  const allowDms = normalizeAllowDms(row?.allow_dms);
  const directAllowed = !blocked && activeEstablishedRoom;
  const requestAllowed =
    !blocked && !activeEstablishedRoom && allowDms === "anyone";
  const canMessage =
    !blocked && (activeEstablishedRoom || directAllowed || requestAllowed);
  const messageMode = activeEstablishedRoom
    ? "existing"
    : requestAllowed
      ? "request"
      : "none";

  return {
    blocked,
    allowDms,
    directAllowed,
    requestAllowed,
    activeEstablishedRoom,
    canMessage,
    messageMode,
  };
}
