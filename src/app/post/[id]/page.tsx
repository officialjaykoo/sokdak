import { ListIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CommentComposer } from "@/components/comments/comment-composer";
import { CommentThread } from "@/components/comments/comment-thread";
import { SiteHeader } from "@/components/layout/site-header";
import { PageBackdrop } from "@/components/layout/page-backdrop";
import { PageShell } from "@/components/layout/page-shell";
import { PostCard } from "@/components/feed/post-card";
import { PostAuthorActions } from "@/components/posts/post-author-actions";
import { PostBodyPanel } from "@/components/posts/post-body-panel";
import { getPostDetail } from "@/lib/content";
import { getRequestLocale } from "@/lib/i18n/server";
import { tLocale } from "@/lib/i18n/translate";
import { getSession } from "@/lib/session";
import { redirectIfIncompleteOnboarding } from "@/lib/onboarding-access";

export const dynamic = "force-dynamic";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  await redirectIfIncompleteOnboarding(session?.user?.id);
  const { locale } = await getRequestLocale();
  const post = await getPostDetail(id, session?.user?.id ?? null);
  if (!post) notFound();

  return (
    <>
      <SiteHeader />
      <main className="relative flex-1">
        <PageBackdrop variant="subtle" />
        <PageShell width="standard" className="space-y-6">

          <div className="flex items-center justify-between gap-2 px-1">
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Link
                href="/"
                className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ListIcon className="size-3.5" aria-hidden />
                {tLocale(locale, "board.list")}
              </Link>
              <span className="tabular-nums">No.{post.num}</span>
              {post.isNotice ? (
                <span className="rounded bg-[var(--brand)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {tLocale(locale, "board.notice")}
                </span>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {tLocale(locale, "board.views")} {post.views}
            </p>
          </div>

          <PostCard
            post={post}
            showBody={false}
            canModerate={session?.user?.role === "admin"}
          />

          <PostAuthorActions
            postId={post.id}
            isOwner={Boolean(post.author.isAuthor)}
            postType={post.mediaKey ? "image" : post.url ? "link" : "text"}
            initialTitle={post.title}
            initialBody={post.body}
            initialUrl={post.url}
            commentCount={post.commentCount}
          />


          {post.url ? (
            <p className="text-sm">
              <a
                href={post.url}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--brand)] hover:underline"
              >
                {post.url}
              </a>
            </p>
          ) : null}

          {post.body ? <PostBodyPanel body={post.body} /> : null}

          <section className="space-y-4">
            <h2 className="font-heading text-xl font-semibold">
              {tLocale(locale, "pages.comments")}
            </h2>
            {post.isLocked ? (
              <p className="text-sm text-muted-foreground">
                {tLocale(locale, "pages.postLocked")}
              </p>
            ) : (
              <CommentComposer postId={post.id} />
            )}
            <CommentThread
              comments={post.comments}
              postId={post.id}
              viewerId={session?.user?.id ?? null}
            />
          </section>
        </PageShell>
      </main>
    </>
  );
}
