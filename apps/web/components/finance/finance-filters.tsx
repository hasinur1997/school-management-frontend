"use client"

/**
 * Shared filter bar for the income and expense ledgers (task F-5.4): a
 * type-scoped `CategorySelect`, an inclusive from/to date range, a title/item
 * search, and a Clear action shown only when a filter is active. Fully
 * controlled — the parent owns the values and resets to page 1 on every change.
 */

import { Search, X } from "lucide-react"

import { Input } from "@workspace/ui/components/input"
import { Button } from "@/components/button"
import type { CategoryType } from "@/types/finance"
import { CategorySelect } from "./category-select"

export interface FinanceFiltersValue {
  categoryId: string | null
  from: string | null
  to: string | null
  search: string
}

export interface FinanceFiltersProps {
  /** Category type the select is scoped to (income vs expense). */
  type: CategoryType
  value: FinanceFiltersValue
  onCategoryChange: (value: string | null) => void
  onFromChange: (value: string | null) => void
  onToChange: (value: string | null) => void
  onSearchChange: (value: string) => void
  onClear: () => void
  /** Placeholder for the free-text search (row-specific noun). */
  searchPlaceholder: string
}

export function FinanceFilters({
  type,
  value,
  onCategoryChange,
  onFromChange,
  onToChange,
  onSearchChange,
  onClear,
  searchPlaceholder,
}: FinanceFiltersProps) {
  const hasFilters =
    value.categoryId != null ||
    value.from != null ||
    value.to != null ||
    value.search.trim() !== ""

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="sm:w-48">
        <CategorySelect
          type={type}
          value={value.categoryId}
          onValueChange={onCategoryChange}
          clearLabel="All categories"
          placeholder="All categories"
          aria-label="Filter by category"
        />
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={value.from ?? ""}
          onChange={(event) => onFromChange(event.target.value || null)}
          aria-label="From date"
          className="sm:w-40"
        />
        <span className="text-sm text-copy-muted" aria-hidden>
          –
        </span>
        <Input
          type="date"
          value={value.to ?? ""}
          onChange={(event) => onToChange(event.target.value || null)}
          aria-label="To date"
          className="sm:w-40"
        />
      </div>
      <div className="relative sm:w-56">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-copy-muted"
          aria-hidden
        />
        <Input
          value={value.search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
          aria-label={searchPlaceholder}
        />
      </div>
      {hasFilters ? (
        <Button variant="ghost" onClick={onClear}>
          <X className="size-4" aria-hidden />
          Clear
        </Button>
      ) : null}
    </div>
  )
}
