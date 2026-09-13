import Link from "next/link";
import type { ReactNode } from "react";

import { PageBackdrop } from "@/components/layout/page-backdrop";
import { PageHero } from "@/components/layout/page-hero";
import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { SiteHeader } from "@/components/layout/site-header";
import { SearchForm } from "@/components/search/search-form";
import { getRequestLocale } from "@/lib/i18n/server";
import { getSession } from "@/lib/session";
import { redirectIfIncompleteOnboarding } from "@/lib/onboarding-access";
import { tLocale } from "@/lib/i18n/translate";
import { normalizeSearchQuery, searchAll } from "@/lib/search";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  await redirectIfIncompleteOnboarding(session?.user?.id);
  const params = await searchParams;
  const query = normalizeSearchQuery(params.q ?? "");
  const results = query
    ? await searchAll(query, {}, session?.user?.id ?? null)
    : null;
  const { locale } = await getRequestLocale();

  return (
    <>
      <SiteHeader />
      <main className="relative flex-1">
        <PageBackdrop variant="subtle" />
        <PageShell width="standard" className="space-y-8">
          <PageHero
            eyebrow={tLocale(locale, "search.title")}
            title={
              query ? (
                <>
                  {tLocale(locale, "pages.searchResultsFor")}{" "}
                  <span className="text-[var(--brand)]">“{query}”</span>
                </>
              ) : (
                tLocale(locale, "pages.findBlurb")
              )
            }
          />
          <div className="max-w-xl">
            <SearchForm initialQuery={query} autoFocus={!query} />
          </div>

          {query && results ? (
            <div className="space-y-10">
              <SearchSection
                title={tLocale(locale, "search.posts")}
                empty={tLocale(locale, "pages.noPostsMatched")}
                count={results.posts.length}
              >
                <ul className="space-y-2">
                  {results.posts.map((post) => (
                    <li key={post.id}>
                      <Link
                        href={`/post/${post.id}`}
                        className="block rounded-2xl border border-border/60 bg-card/70 px-4 py-3 transition-colors hover:bg-muted/50"
                      >
                        <p className="font-heading text-sm font-semibold leading-snug text-balance">
                          {post.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {tLocale(locale, "board.anonymous")}(
                          {post.authorTag}) ·{" "}
                          {tLocale(locale, "search.likes", {
                            count: post.likeCount,
                          })}{" "}
                          · {post.commentCount}{" "}
                          {tLocale(locale, "feed.comments")}
                        </p>
                        {post.body ? (
                          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                            {post.body}
                          </p>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </SearchSection>
            </div>
          ) : null}
        </PageShell>
      </main>
    </>
  );
}

function SearchSection({
  title,
  empty,
  count,
  children,
}: {
  title: string;
  empty: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      {count === 0 ? (
        <EmptyState>{empty}</EmptyState>
      ) : (
        children
      )}
    </section>
  );
}
