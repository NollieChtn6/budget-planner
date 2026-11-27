"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from "@/lib/operations-pagination";

export function OperationsPagination({
  month,
  q,
  categoryId,
  page,
  pageSize,
  pageCount,
}: {
  month: string;
  q: string;
  categoryId: string;
  page: number;
  pageSize: number;
  pageCount: number;
}) {
  const router = useRouter();

  function hrefFor(next: { page?: number; pageSize?: number }) {
    const params = new URLSearchParams({ month });
    if (q) params.set("q", q);
    if (categoryId) params.set("category", categoryId);
    const nextSize = next.pageSize ?? pageSize;
    if (nextSize !== DEFAULT_PAGE_SIZE) params.set("perPage", String(nextSize));
    if (next.page && next.page > 1) params.set("page", String(next.page));
    return `/operations?${params.toString()}`;
  }

  return (
    <nav
      aria-label="Pagination des opérations"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span id="operations-page-size-label">Par page</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) =>
            router.replace(hrefFor({ pageSize: Number(value) }), { scroll: false })
          }
        >
          <SelectTrigger
            aria-labelledby="operations-page-size-label"
            className="w-auto min-w-[72px] max-md:data-[size=default]:h-11"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={hrefFor({ page: page - 1 })}
            className={buttonVariants({ variant: "outline", size: "icon" })}
            aria-label="Page précédente"
          >
            <ChevronLeft />
          </Link>
        ) : (
          <Button variant="outline" size="icon" disabled aria-label="Page précédente">
            <ChevronLeft />
          </Button>
        )}
        <span className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
          Page {page} sur {pageCount}
        </span>
        {page < pageCount ? (
          <Link
            href={hrefFor({ page: page + 1 })}
            className={buttonVariants({ variant: "outline", size: "icon" })}
            aria-label="Page suivante"
          >
            <ChevronRight />
          </Link>
        ) : (
          <Button variant="outline" size="icon" disabled aria-label="Page suivante">
            <ChevronRight />
          </Button>
        )}
      </div>
    </nav>
  );
}
