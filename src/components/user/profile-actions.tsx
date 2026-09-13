"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  MessageSquareIcon,
  UserRoundXIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";
import { useI18n } from "@/components/i18n/i18n-provider";
import { useLocalizedError } from "@/components/i18n/use-localized-error";
import { announceUnreadChanged } from "@/components/notifications/use-unread-count";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { getUsernameProfileHref } from "@/lib/profile-url";
import type { RelationshipProjection } from "@/lib/user-actions";

type Action = "block" | "unblock" | "mute" | "unmute";

type RelationshipResponse = {
  relationship?: RelationshipProjection;
};

type ProfileActionsProps = {
  targetUserId: string;
  username: string;
  relationship: RelationshipProjection;
  showMessage?: boolean;
  compact?: boolean;
  showBlock?: boolean;
};

export function ProfileActions({
  targetUserId,
  username,
  relationship: initialRelationship,
  showMessage = true,
  compact = false,
  showBlock = true,
}: ProfileActionsProps) {
  const router = useRouter();
  const { t } = useI18n();
  const localizeError = useLocalizedError();
  const [relationship, setRelationship] = useState(initialRelationship);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const buttonClass = compact
    ? "min-h-8 gap-1 px-2 text-xs"
    : "min-h-11 gap-1.5 sm:min-h-8";
  function run(action: Action) {
    setError(null);
    startTransition(async () => {
      try {
        const isBlockApi = action === "block" || action === "unblock";
        const endpoint = isBlockApi
          ? `/api/me/blocks/${encodeURIComponent(targetUserId)}`
          : `/api/users/${encodeURIComponent(username)}`;
        const method = action === "unblock" ? "DELETE" : "POST";
        const body = isBlockApi ? undefined : { action };
        const res = await apiFetch(endpoint, {
          method,
          ...(body
            ? {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              }
            : {}),
        });
        if (res.status === 401) {
          router.push(
            `/login?next=${encodeURIComponent(
              getUsernameProfileHref(username) ?? "/"
            )}`
          );
          return;
        }
        const payload = (await res.json().catch(() => null)) as
          | (RelationshipResponse & { error?: string })
          | null;
        if (!res.ok) {
          setError(localizeError(payload?.error, "Action failed"));
          return;
        }
        if (!payload?.relationship) {
          setError(t("common.networkError"));
          return;
        }
        setRelationship(payload.relationship);
        if (action === "block") announceUnreadChanged();
        router.refresh();
      } catch {
        setError(t("common.networkError"));
      }
    });
  }

  const blockedByMe = relationship.blockState === "blocked_by_me";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showMessage && relationship.canMessage ? (
        <Link
          href={`/messages?to=${encodeURIComponent(username)}`}
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            buttonClass
          )}
        >
          <MessageSquareIcon className="size-4" aria-hidden />
          {t("profile.message")}
        </Link>
      ) : null}
      {!relationship.isSelf ? (
        <Button
          type="button"
          size="sm"
          variant={relationship.muteState === "muted" ? "secondary" : "outline"}
          className={buttonClass}
          disabled={pending}
          onClick={() =>
            run(relationship.muteState === "muted" ? "unmute" : "mute")
          }
        >
          {relationship.muteState === "muted" ? (
            <Volume2Icon className="size-4" aria-hidden />
          ) : (
            <VolumeXIcon className="size-4" aria-hidden />
          )}
          {relationship.muteState === "muted"
            ? t("profile.unmute")
            : t("profile.mute")}
        </Button>
      ) : null}
      {showBlock ? (
        <Button
          type="button"
          size="sm"
          variant={blockedByMe ? "secondary" : "outline"}
          className={buttonClass}
          disabled={pending}
          onClick={() => run(blockedByMe ? "unblock" : "block")}
        >
          {blockedByMe ? null : (
            <UserRoundXIcon className="size-4" aria-hidden />
          )}
          {blockedByMe ? t("settings.unblock") : t("profile.block")}
        </Button>
      ) : null}
      {error ? (
        <p className="w-full text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
