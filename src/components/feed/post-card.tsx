"use client";

import { MessageCircleIcon, Share2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { useI18n } from "@/components/i18n/i18n-provider";
import { useLocalizedError } from "@/components/i18n/use-localized-error";
import { RelativeTime } from "@/components/time/relative-time";
import { LikeButton } from "@/components/likes/like-button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PostMedia } from "@/components/posts/post-media";
import { PostOverflowMenu } from "@/components/posts/post-overflow-menu";
import { AccountTags } from "@/components/user/account-tags";
import type { FeedPost, LikeMutation, LikeResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { copyTextToClipboard } from "@/lib/clipboard";
import { getCanonicalPostUrl } from "@/lib/post-url";

interface PostCardProps {
  post: FeedPost;
  showBody?: boolean;
  canModerate?: boolean;
}

export function PostCard({
  post,
  showBody = true,
  canModerate = false,
}: PostCardProps) {
  const router = useRouter();
  const { t } = useI18n();
  const localizeError = useLocalizedError();
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [liked, setLiked] = useState(post.liked);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const resetId = window.setTimeout(() => {
      setLikeCount(post.likeCount);
      setLiked(post.liked);
      setDismissed(false);
      setShareMessage(null);
      setShareError(null);
    }, 0);
    return () => window.clearTimeout(resetId);
  }, [post.id, post.likeCount, post.liked]);

  if (dismissed) {
    return null;
  }

  function applyLike(action: LikeMutation) {
    if (pending) return;

    setError(null);
    const previous = liked;
    const optimisticLikeDelta =
      action === "like" && !previous
        ? 1
        : action === "unlike" && previous
          ? -1
          : 0;
    const snapshot = { likeCount, liked };
    setLikeCount((value) => Math.max(0, value + optimisticLikeDelta));
    setLiked(action === "like");

    startTransition(async () => {
      try {
        const response = await apiFetch(`/api/posts/${post.id}/like`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });

        if (response.status === 401) {
          setLikeCount(snapshot.likeCount);
          setLiked(snapshot.liked);
          router.push(
            `/login?next=${encodeURIComponent(`/post/${post.id}`)}`
          );
          return;
        }

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(payload?.error ?? "Like failed");
        }

        const result = (await response.json()) as LikeResult;
        setLikeCount(result.likeCount);
        setLiked(result.liked);
      } catch (likeError) {
        setLikeCount(snapshot.likeCount);
        setLiked(snapshot.liked);
        setError(
          localizeError(
            likeError instanceof Error ? likeError.message : null,
            "Couldn't apply like. Try again."
          )
        );
      }
    });
  }
  const postHref = `/post/${encodeURIComponent(post.id)}`;
  async function sharePost(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setShareMessage(null);
    setShareError(null);

    const url = getCanonicalPostUrl(post.id, window.location.origin);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: post.title, url });
      } else {
        await copyTextToClipboard(url);
        setShareMessage(t("post.linkCopied"));
      }
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === "AbortError") {
        return;
      }
      setShareError(t("post.copyLinkFailed"));
    }
  }


  function openPost(event: React.MouseEvent | React.KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (
      target?.closest(
        "a, button, input, textarea, select, [role='menuitem'], [data-no-nav]"
      )
    ) {
      return;
    }
    router.push(postHref);
  }

  return (
    <article>
      <Card
        size="sm"
        className={cn(
          "rounded-xl border border-border/80 bg-card shadow-[0_1px_2px_rgb(0_0_0_/_8%)]",
          "transition-[box-shadow] duration-200",
          "motion-safe:hover:shadow-md"
        )}
      >
        <div
          className="min-w-0 cursor-pointer overflow-hidden"
          onClick={openPost}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              // Let nested links/buttons handle their own keys
              const target = event.target as HTMLElement;
              if (target !== event.currentTarget) return;
              event.preventDefault();
              router.push(postHref);
            }
          }}
        >
          <CardHeader className="gap-3 px-4 pt-4 pb-0">
            <div className="flex items-center gap-2.5">
              <div className="min-w-0 flex-1">
                <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 break-anywhere text-sm">
                  <span className="font-semibold text-foreground">
                    {t("board.anonymous")}({post.author.anonTag})
                  </span>
                  <AccountTags tags={post.author.tags} />
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                  <RelativeTime value={post.createdAt} />
                  {post.views > 0 ? (
                    <span>
                      · {t("board.views")} {post.views}
                    </span>
                  ) : null}
                </p>
              </div>
              <div data-no-nav>
                <PostOverflowMenu
                  postId={post.id}
                  authorTag={post.author.anonTag}
                  isAuthor={post.author.isAuthor}
                  canModerate={canModerate}
                  isNotice={post.isNotice}
                  saved={post.saved}
                  onDismiss={() => setDismissed(true)}
                />
              </div>
            </div>
            <CardTitle className="break-anywhere text-lg leading-snug font-semibold tracking-tight text-balance">
              <Link href={postHref} className="hover:underline">
                {post.title}
              </Link>
            </CardTitle>
          </CardHeader>

          {showBody && post.body ? (
            <CardContent className="px-4 pt-2 pb-0">
              <p className="line-clamp-4 text-[15px] leading-relaxed text-card-foreground/85 [overflow-wrap:anywhere]">
                {post.body}
              </p>
            </CardContent>
          ) : null}

          {post.mediaKey ? (
            <CardContent className="px-4 pt-3 pb-0">
              <PostMedia
                mediaKey={post.mediaKey}
                alt={post.title}
                className="max-h-[32rem]"
              />
            </CardContent>
          ) : null}

          <CardFooter
            data-post-actions
            className="mt-2 flex flex-wrap gap-1 border-t border-border/70 px-2 py-1 !pt-1"
          >
            <div data-no-nav className="min-w-0 flex-1">
              <LikeButton
                likeCount={likeCount}
                liked={liked}
                pending={pending}
                layout="horizontal"
                onToggle={applyLike}
              />
            </div>
            <Link
              href={postHref}
              data-no-nav
              className="inline-flex min-h-11 sm:min-h-9 min-w-[7rem] flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold leading-tight text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <MessageCircleIcon className="size-4 shrink-0" aria-hidden />
              <span>
                {post.commentCount}{" "}
                {post.commentCount === 1
                  ? t("feed.comment")
                  : t("feed.comments")}
              </span>
            </Link>
            <button
              type="button"
              data-no-nav
              className="inline-flex min-h-11 sm:min-h-9 min-w-[7rem] flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold leading-tight text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t("post.share")}
              onClick={sharePost}
            >
              <Share2Icon className="size-4 shrink-0" aria-hidden />
              <span>{t("post.share")}</span>
            </button>
            {shareMessage ? (
              <span className="w-full px-2 text-xs text-muted-foreground" role="status">
                {shareMessage}
              </span>
            ) : null}
            {shareError ? (
              <span className="w-full px-2 text-xs text-destructive" role="alert">
                {shareError}
              </span>
            ) : null}
            {error ? (
              <span className="w-full px-2 text-xs text-destructive" role="alert">
                {error}
              </span>
            ) : null}
          </CardFooter>
        </div>
      </Card>
    </article>
  );
}
