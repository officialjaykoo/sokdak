import {
  FlameIcon,
  HomeIcon,
  PlusIcon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BoardList } from "@/components/board/board-list";
import { BoardPagination } from "@/components/board/board-pagination";
import { FeedComposer } from "@/components/feed/feed-composer";
import { FeedSortTabs } from "@/components/feed/feed-controls";
import { PageBackdrop } from "@/components/layout/page-backdrop";
import { PageShell } from "@/components/layout/page-shell";
import { SiteHeader } from "@/components/layout/site-header";
import {
  DEFAULT_POPULAR_WINDOW,
  getBoardPosts,
  parsePopularWindow,
  type BoardPage,
  type FeedSort,
  type PopularWindow,
} from "@/lib/db";
import { getRequestLocale } from "@/lib/i18n/server";
import { tLocale } from "@/lib/i18n/translate";
import { UserAvatar } from "@/components/user/user-avatar";
import { getSession } from "@/lib/session";
import { getOnboardingState } from "@/lib/onboarding";
import { getProfileHref } from "@/lib/profile-url";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const BOARD_PER_PAGE = 20;

async function loadBoard(options: {
  sort: FeedSort;
  window: PopularWindow;
  page: number;
  viewerUserId: string | null;
}): Promise<BoardPage> {
  try {
    return await getBoardPosts({
      page: options.page,
      perPage: BOARD_PER_PAGE,
      viewerUserId: options.viewerUserId,
      sort: options.sort,
      window: options.window,
    });
  } catch (error) {
    console.error("Failed to load board page", error);
    return {
      notices: [],
      posts: [],
      page: 1,
      perPage: BOARD_PER_PAGE,
      total: 0,
      totalPages: 1,
    };
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    sort?: string;
    window?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const popularWindow =
    parsePopularWindow(params.window) ?? DEFAULT_POPULAR_WINDOW;
  const pageParam = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const session = await getSession();
  const onboarding = session?.user
    ? await getOnboardingState(session.user.id)
    : null;
  if (onboarding && !onboarding.onboardingComplete) {
    redirect("/onboarding");
  }
  const { locale } = await getRequestLocale();
  const signedIn = Boolean(session?.user);
  const username =
    onboarding?.username ??
    (session?.user as { username?: string } | undefined)?.username ??
    null;
  const profileHref = getProfileHref(session?.user);
  const profileLabel =
    username ?? onboarding?.name ?? session?.user?.name ?? tLocale(locale, "nav.logIn");
  const image = session?.user?.image ?? null;
  const desktopLinks = [
    {
      href: "/?sort=popular",
      label: tLocale(locale, "nav.popular"),
      icon: FlameIcon,
    },
    { href: "/", label: tLocale(locale, "nav.home"), icon: HomeIcon },
    {
      href: "/submit",
      label: tLocale(locale, "nav.createPost"),
      icon: PlusIcon,
    },
    {
      href: profileHref,
      label: tLocale(locale, "nav.profile"),
      icon: UserRoundIcon,
    },
  ];
  const sort: FeedSort = params.sort === "popular" ? "popular" : "new";
  const board = await loadBoard({
    sort,
    window: popularWindow,
    page: pageParam,
    viewerUserId: session?.user?.id ?? null,
  });

  return (
    <>
      <SiteHeader />
      <main className="relative flex-1">
        <PageBackdrop />
        <PageShell width="wide" className="grid py-4 sm:py-6 xl:grid-cols-[228px_minmax(0,860px)] xl:gap-5">
          <aside className="hidden xl:block">
            <nav
              className="sticky top-[4.5rem] max-h-[calc(100dvh-5.5rem)] space-y-1 overflow-y-auto pr-2"
              aria-label={tLocale(locale, "nav.menu")}
            >
              <Link
                href={profileHref}
                className="mb-2 flex min-h-12 items-center gap-3 rounded-xl px-3 py-1.5 transition-colors hover:bg-card"
              >
                <UserAvatar
                  alt={username ? `@${username}` : profileLabel}
                />
                <span className="truncate text-sm font-semibold">
                  {username ? `@${username}` : profileLabel}
                </span>
              </Link>
              <div className="mb-2 h-px bg-border/70" />
              {desktopLinks.map(({ href, label, icon: Icon }) => {
                const active =
                  (href === "/?sort=popular" && sort === "popular") ||
                  (href === "/" && sort === "new");
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-foreground",
                      active &&
                        "bg-[color-mix(in_oklch,var(--brand)_8%,transparent)] text-[var(--brand)]"
                    )}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          <div className="min-w-0 xl:col-start-2">
            <section className="mb-3 px-1 pt-1 sm:pt-2">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-2.5 rounded-full bg-[var(--flag-gold)] ring-4 ring-[color-mix(in_oklch,var(--flag-gold)_22%,transparent)]"
                />
                <p className="text-xs font-semibold tracking-[0.14em] text-[var(--brand)] uppercase">
                  {sort === "new"
                    ? tLocale(locale, "feed.new")
                    : tLocale(locale, "feed.popular")}
                </p>
              </div>
              <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                속닥속닥
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {tLocale(locale, "feed.homeBlurb")}
              </p>
            </section>

            <FeedSortTabs
              current={sort}
              popularWindow={popularWindow}
            />

            <FeedComposer
              signedIn={signedIn}
              username={username}
              image={image}
              title={tLocale(locale, "nav.createPost")}
              prompt={tLocale(locale, "comments.placeholder")}
              textLabel={tLocale(locale, "post.text")}
              imageLabel={tLocale(locale, "post.image")}
              linkLabel={tLocale(locale, "post.link")}
            />
            <BoardList
              notices={board.notices}
              posts={board.posts}
              page={board.page}
              perPage={board.perPage}
              total={board.total}
              locale={locale}
              labels={{
                num: tLocale(locale, "board.num"),
                title: tLocale(locale, "board.title"),
                author: tLocale(locale, "board.author"),
                date: tLocale(locale, "board.date"),
                views: tLocale(locale, "board.views"),
                likes: tLocale(locale, "board.likes"),
                notice: tLocale(locale, "board.notice"),
                comments: tLocale(locale, "feed.comments"),
                empty: tLocale(locale, "board.empty"),
                anonymous: tLocale(locale, "board.anonymous"),
              }}
            />
            <BoardPagination
              page={board.page}
              totalPages={board.totalPages}
              params={{
                sort: params.sort,
                window: params.window,
              }}
              labels={{
                first: tLocale(locale, "board.first"),
                prev: tLocale(locale, "board.prev"),
                next: tLocale(locale, "board.next"),
                last: tLocale(locale, "board.last"),
              }}
            />
          </div>
        </PageShell>
      </main>
    </>
  );
}
