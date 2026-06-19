"use client"

/**
 * Topbar global-search slot (task 1.5). The real command palette ships in 1.6;
 * this is the visual placeholder it replaces — a full input-style trigger on
 * `≥ md` and a search icon on `< md`, matching the responsive spec. Inert for
 * now (disabled) so it never looks broken before 1.6 wires it up.
 */

import { Search } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

export function SearchPlaceholder() {
  return (
    <>
      {/* ≥ md: input-style trigger */}
      <button
        type="button"
        disabled
        className="hidden h-9 w-full max-w-md items-center gap-2 rounded-md border border-surface-border bg-base px-3 text-sm text-copy-muted md:flex"
        aria-label="Search (coming soon)"
      >
        <Search className="size-4" aria-hidden />
        <span>Search…</span>
        <kbd className="ml-auto rounded border border-surface-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-copy-muted">
          ⌘K
        </kbd>
      </button>

      {/* < md: icon trigger */}
      <Button
        variant="ghost"
        size="icon"
        disabled
        className="size-11 md:hidden"
        aria-label="Search (coming soon)"
      >
        <Search className="size-5" />
      </Button>
    </>
  )
}
