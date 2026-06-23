"use client"

/**
 * The shared list pagination footer used by the admissions, students, and
 * teachers tables. Mirrors the imported "School MS" design: a left-aligned
 * "Showing X–Y of Z <unit>" summary and right-aligned numbered page buttons
 * flanked by Prev / Next. The active page is a filled primary button; the rest
 * are outline buttons. Page numbers are windowed so the control never overflows.
 *
 * Driven by the API `PaginationMeta` (`from` / `to` / `total` are
 * authoritative for the summary; `current_page` / `last_page` for navigation).
 */

import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@/components/button"
import type { PaginationMeta } from "@/types/api"

interface ListPagerProps {
  meta: PaginationMeta | undefined
  /** Fallbacks when meta is missing (optimistic / first render). */
  page: number
  lastPage: number
  /** Singular unit noun, e.g. "application". */
  unit: string
  /** Plural override; defaults to `${unit}s`. */
  unitPlural?: string
  disabled?: boolean
  onPage: (page: number) => void
}

/** A windowed list of page numbers around the current page (max 7 slots). */
function pageWindow(current: number, last: number): number[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)
  const pages = new Set<number>([1, last, current, current - 1, current + 1])
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p))
  if (current >= last - 2) [last - 1, last - 2, last - 3].forEach((p) => pages.add(p))
  return [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b)
}

export function ListPager({
  meta,
  page,
  lastPage,
  unit,
  unitPlural,
  disabled,
  onPage,
}: ListPagerProps) {
  const current = meta?.current_page ?? page
  const last = meta?.last_page ?? lastPage
  const total = meta?.total
  const plural = unitPlural ?? `${unit}s`
  const noun = total === 1 ? unit : plural

  // `from` / `to` are the authoritative 1-based bounds of the page, but some
  // list endpoints omit them or send null/0. Derive them from the page size
  // when missing so the summary never reads "0–0 of N".
  const perPage =
    meta?.per_page && meta.per_page > 0
      ? meta.per_page
      : total != null && last > 0
        ? Math.ceil(total / last)
        : undefined
  const hasRows = total != null && total > 0
  const from =
    meta?.from && meta.from > 0
      ? meta.from
      : hasRows && perPage != null
        ? (current - 1) * perPage + 1
        : 0
  const to =
    meta?.to && meta.to > 0
      ? meta.to
      : hasRows && perPage != null
        ? Math.min(current * perPage, total)
        : 0

  const window = pageWindow(current, last)

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      {total != null ? (
        <p className="text-sm text-copy-muted">
          Showing{" "}
          <strong className="font-semibold text-copy-primary">
            {from ?? 0}
          </strong>
          –
          <strong className="font-semibold text-copy-primary">{to ?? 0}</strong>{" "}
          of{" "}
          <strong className="font-semibold text-copy-primary">{total}</strong>{" "}
          {noun}
        </p>
      ) : (
        <span />
      )}

      {last > 1 ? (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || current <= 1}
            onClick={() => onPage(current - 1)}
            className="h-8.5 gap-1 px-2.5 text-[13px] font-medium"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Prev
          </Button>

          {window.map((n, i) => {
            const gap = i > 0 && n - window[i - 1]! > 1
            return (
              <div key={n} className="flex items-center gap-1.5">
                {gap ? (
                  <span className="px-1 text-sm text-copy-muted" aria-hidden>
                    …
                  </span>
                ) : null}
                <Button
                  variant={n === current ? "default" : "outline"}
                  size="sm"
                  aria-current={n === current ? "page" : undefined}
                  disabled={disabled}
                  onClick={() => onPage(n)}
                  className={cn(
                    "h-8.5 min-w-8.5 px-2 text-[13px]",
                    n === current ? "pointer-events-none font-semibold" : "font-medium"
                  )}
                >
                  {n}
                </Button>
              </div>
            )
          })}

          <Button
            variant="outline"
            size="sm"
            disabled={disabled || current >= last}
            onClick={() => onPage(current + 1)}
            className="h-8.5 gap-1 px-2.5 text-[13px] font-medium"
          >
            Next
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
