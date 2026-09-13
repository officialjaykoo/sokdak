import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type BoardPaginationProps = {
  page: number;
  totalPages: number;
  /** Query params preserved across pages, e.g. { sort: "popular", window: "7d" }. */
  params: Record<string, string | undefined>;
  labels: { first: string; prev: string; next: string; last: string };
};

function hrefFor(page: number, params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  if (page > 1) qs.set("page", String(page));
  const query = qs.toString();
  return query ? `/?${query}` : "/";
}

export function BoardPagination({
  page,
  totalPages,
  params,
  labels,
}: BoardPaginationProps) {
  if (totalPages <= 1) return null;

  // GNUBoard-style windowed pagination: 10 pages per block.
  const blockSize = 10;
  const blockStart = Math.floor((page - 1) / blockSize) * blockSize + 1;
  const blockEnd = Math.min(blockStart + blockSize - 1, totalPages);
  const pages = Array.from(
    { length: blockEnd - blockStart + 1 },
    (_, i) => blockStart + i
  );

  const linkClass = (disabled: boolean) =>
    cn(
      "inline-flex size-9 items-center justify-center rounded-md text-sm transition-colors",
      disabled
        ? "pointer-events-none text-muted-foreground/40"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  return (
    <nav
      className="mt-3 flex items-center justify-center gap-0.5"
      aria-label="pagination"
    >
      <Link
        href={hrefFor(1, params)}
        aria-disabled={page === 1}
        aria-label={labels.first}
        className={linkClass(page === 1)}
      >
        <ChevronsLeftIcon className="size-4" />
      </Link>
      <Link
        href={hrefFor(Math.max(1, page - 1), params)}
        aria-disabled={page === 1}
        aria-label={labels.prev}
        className={linkClass(page === 1)}
      >
        <ChevronLeftIcon className="size-4" />
      </Link>
      {pages.map((p) => (
        <Link
          key={p}
          href={hrefFor(p, params)}
          aria-current={p === page ? "page" : undefined}
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-md text-sm font-medium tabular-nums transition-colors",
            p === page
              ? "bg-[var(--brand)] font-bold text-white"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {p}
        </Link>
      ))}
      <Link
        href={hrefFor(Math.min(totalPages, page + 1), params)}
        aria-disabled={page === totalPages}
        aria-label={labels.next}
        className={linkClass(page === totalPages)}
      >
        <ChevronRightIcon className="size-4" />
      </Link>
      <Link
        href={hrefFor(totalPages, params)}
        aria-disabled={page === totalPages}
        aria-label={labels.last}
        className={linkClass(page === totalPages)}
      >
        <ChevronsRightIcon className="size-4" />
      </Link>
    </nav>
  );
}
