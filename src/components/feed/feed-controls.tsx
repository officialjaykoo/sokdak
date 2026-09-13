"use client";

import { useRouter } from "next/navigation";

import { useI18n } from "@/components/i18n/i18n-provider";
import { cn } from "@/lib/utils";

type FeedSortTab = "new" | "popular";

export function FeedSortTabs({
  current,
  popularWindow = "all",
}: {
  current: FeedSortTab;
  popularWindow?: "day" | "week" | "month" | "all";
}) {
  const { t } = useI18n();
  const router = useRouter();

  function hrefFor(
    sort: FeedSortTab,
    window: "day" | "week" | "month" | "all" = popularWindow
  ) {
    if (sort === "new") return "/";
    return window === "all"
      ? "/?sort=popular"
      : `/?sort=popular&window=${window}`;
  }

  return (
    <>
      <div
        className="mb-1 flex gap-1 border-b border-border/70"
        role="tablist"
        aria-label={t("feed.modeLabel")}
      >
        {[
          { id: "new" as const, label: t("feed.new") },
          { id: "popular" as const, label: t("feed.popular") },
        ].map((tab) => {
          const active = current === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn(
                "relative inline-flex min-h-10 items-center rounded-t-lg border-b-2 border-transparent px-3 text-sm font-semibold transition-colors hover:bg-muted/70",
                active
                  ? "border-[var(--brand)] text-[var(--brand)]"
                  : "text-muted-foreground"
              )}
              onClick={() => router.push(hrefFor(tab.id))}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {current === "popular" ? (
        <div
          className="mb-3 flex flex-wrap gap-1.5"
          aria-label={t("feed.popularWindowLabel")}
        >
          {[
            { id: "day" as const, label: t("feed.today") },
            { id: "week" as const, label: t("feed.thisWeek") },
            { id: "month" as const, label: t("feed.thisMonth") },
            { id: "all" as const, label: t("feed.allTime") },
          ].map((window) => {
            const active = popularWindow === window.id;
            return (
              <button
                key={window.id}
                type="button"
                aria-pressed={active}
                className={cn(
                  "min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors",
                  active
                    ? "border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_10%,transparent)] text-[var(--brand)]"
                    : "border-border/70 text-muted-foreground hover:bg-muted/70"
                )}
                onClick={() => router.push(hrefFor("popular", window.id))}
              >
                {window.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
