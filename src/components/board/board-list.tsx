import Link from "next/link";

import { AccountTags } from "@/components/user/account-tags";
import type { FeedPost } from "@/lib/types";
import { cn } from "@/lib/utils";

type BoardListProps = {
  notices: FeedPost[];
  posts: FeedPost[];
  page: number;
  perPage: number;
  total: number;
  locale: "ko" | "en";
  labels: {
    num: string;
    title: string;
    author: string;
    date: string;
    views: string;
    likes: string;
    notice: string;
    comments: string;
    empty: string;
    anonymous: string;
  };
};

/** GNUBoard-style date: HH:MM for today, MM.DD otherwise. */
function boardDate(value: string, locale: "ko" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString(locale === "ko" ? "ko-KR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return date.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
    month: "2-digit",
    day: "2-digit",
  });
}

function BoardRow({
  post,
  displayNum,
  isNotice,
  locale,
  labels,
}: {
  post: FeedPost;
  displayNum: number | null;
  isNotice: boolean;
  locale: "ko" | "en";
  labels: BoardListProps["labels"];
}) {
  const href = `/post/${encodeURIComponent(post.id)}`;
  return (
    <tr
      className={cn(
        "border-b border-border/60 transition-colors last:border-b-0 hover:bg-muted/40",
        isNotice && "bg-[color-mix(in_oklch,var(--brand)_6%,transparent)]"
      )}
    >
      <td className="w-12 px-2 py-2.5 text-center text-xs text-muted-foreground tabular-nums sm:w-16">
        {isNotice ? (
          <span className="inline-block rounded bg-[var(--brand)] px-1.5 py-0.5 text-[10px] font-bold text-white">
            {labels.notice}
          </span>
        ) : (
          displayNum
        )}
      </td>
      <td className="min-w-0 px-2 py-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href={href}
            className={cn(
              "truncate text-sm hover:underline",
              isNotice ? "font-bold" : "font-medium"
            )}
          >
            {post.title}
          </Link>
          {post.commentCount > 0 ? (
            <span className="shrink-0 text-xs font-semibold text-[var(--brand)]">
              [{post.commentCount}]
            </span>
          ) : null}
          {post.mediaKey ? (
            <span
              className="shrink-0 text-[10px] text-muted-foreground"
              aria-hidden
            >
              📎
            </span>
          ) : null}
        </div>
        {/* Mobile-only meta line: author · date · views */}
        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground sm:hidden">
          <span>
            {labels.anonymous}({post.author.anonTag})
          </span>
          <span aria-hidden>·</span>
          <span>{boardDate(post.createdAt, locale)}</span>
          <span aria-hidden>·</span>
          <span>
            {labels.views} {post.views}
          </span>
        </p>
      </td>
      <td className="hidden w-32 px-2 py-2.5 text-center text-xs text-muted-foreground sm:table-cell">
        <span className="inline-flex max-w-full items-center gap-1">
          <span className="truncate">
            {labels.anonymous}({post.author.anonTag})
          </span>
          <AccountTags tags={post.author.tags} />
        </span>
      </td>
      <td className="hidden w-20 px-2 py-2.5 text-center text-xs text-muted-foreground tabular-nums sm:table-cell">
        {boardDate(post.createdAt, locale)}
      </td>
      <td className="hidden w-16 px-2 py-2.5 text-center text-xs text-muted-foreground tabular-nums sm:table-cell">
        {post.views}
      </td>
      <td className="hidden w-14 px-2 py-2.5 text-center text-xs text-muted-foreground tabular-nums sm:table-cell">
        {post.likeCount > 0 ? post.likeCount : ""}
      </td>
    </tr>
  );
}

export function BoardList({
  notices,
  posts,
  page,
  perPage,
  total,
  locale,
  labels,
}: BoardListProps) {
  // GNUBoard numbering: newest post gets the highest number.
  const firstNum = total - (page - 1) * perPage;

  if (notices.length === 0 && posts.length === 0) {
    return (
      <div className="rounded-lg border border-border/70 bg-card px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">{labels.empty}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-card">
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="border-b-2 border-border bg-muted/50 text-xs font-semibold text-muted-foreground">
            <th scope="col" className="w-12 px-2 py-2 sm:w-16">
              {labels.num}
            </th>
            <th scope="col" className="px-2 py-2 text-left">
              {labels.title}
            </th>
            <th scope="col" className="hidden w-32 px-2 py-2 sm:table-cell">
              {labels.author}
            </th>
            <th scope="col" className="hidden w-20 px-2 py-2 sm:table-cell">
              {labels.date}
            </th>
            <th scope="col" className="hidden w-16 px-2 py-2 sm:table-cell">
              {labels.views}
            </th>
            <th scope="col" className="hidden w-14 px-2 py-2 sm:table-cell">
              {labels.likes}
            </th>
          </tr>
        </thead>
        <tbody>
          {notices.map((post) => (
            <BoardRow
              key={`notice-${post.id}`}
              post={post}
              displayNum={null}
              isNotice
              locale={locale}
              labels={labels}
            />
          ))}
          {posts.map((post, index) => (
            <BoardRow
              key={post.id}
              post={post}
              displayNum={firstNum - index}
              isNotice={false}
              locale={locale}
              labels={labels}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
