"use client"

/**
 * Topbar global command search (task 1.6) — replaces the 1.5 placeholder.
 *
 * A `Command`-style palette that searches **modules** (the permitted sidebar
 * sections) and **records** (students, teachers, classes, … via their list
 * endpoints). `Cmd/Ctrl+K` opens it; selecting a result navigates. The trigger
 * is a full input on `≥ md` and collapses to a search icon on `< md`, opening
 * the same dialog (`ui-context.md`, Responsive).
 *
 * Modules are filtered from the static nav model by permission + query; records
 * come from `useGlobalSearch` (permission-filtered, debounced, server-queried).
 * Built-in `Command` filtering is disabled (`shouldFilter={false}`) because the
 * record half is already filtered server-side — modules are matched here.
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, Search } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import { useAuth } from "@/components/auth/auth-provider"
import { NAV_GROUPS } from "@/components/app-shell/nav-items"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useGlobalSearch } from "@/hooks/search/use-global-search"
import type { SearchResult } from "@/types/search"

/** A module hit carries the gating (permission + self-service roles) alongside the result. */
type ModuleResult = SearchResult & {
  permission: string
  permissions?: string[]
  roles?: string[]
  roleOnly?: boolean
}

/** All nav items flattened from the grouped sidebar model, as search results. */
const MODULE_RESULTS: ModuleResult[] = NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => ({
    key: `modules:${item.href}`,
    group: "Modules",
    label: item.label,
    href: item.href,
    icon: item.icon,
    value: `modules ${item.label}`,
    permission: item.permission,
    permissions: item.permissions,
    roles: item.roles,
    roleOnly: item.roleOnly,
  }))
)

export function GlobalSearch() {
  const router = useRouter()
  const { hasPermission, roles } = useAuth()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const debounced = useDebouncedValue(query, 250)

  const { groups, isLoading, isActive } = useGlobalSearch(debounced)

  // Permitted modules, matched against the query (all of them when empty, so the
  // palette doubles as quick nav).
  const moduleResults = React.useMemo(() => {
    const q = debounced.trim().toLowerCase()
    return MODULE_RESULTS.filter(
      (m) =>
        (m.roleOnly
          ? (m.roles?.some((role) => roles.includes(role)) ?? false)
          : hasPermission(m.permission) ||
            (m.permissions?.some((permission) => hasPermission(permission)) ??
              false) ||
            (m.roles?.some((role) => roles.includes(role)) ?? false)) &&
        (q === "" || m.label.toLowerCase().includes(q))
    )
  }, [debounced, hasPermission, roles])

  // Open/close, clearing the query on close so the palette reopens clean.
  const setPaletteOpen = React.useCallback((next: boolean) => {
    setOpen(next)
    if (!next) setQuery("")
  }, [])

  // `Cmd/Ctrl+K` toggles the palette from anywhere.
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
        setQuery("")
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  function onSelect(result: SearchResult) {
    setPaletteOpen(false)
    router.push(result.href)
  }

  const hasResults = moduleResults.length > 0 || groups.length > 0
  const showEmpty = !isLoading && !hasResults

  return (
    <>
      {/* ≥ md: input-style trigger. */}
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="hidden h-9 w-full max-w-md items-center gap-2 rounded-md border border-surface-border bg-base px-3 text-sm text-copy-muted transition-colors hover:border-brand/40 md:flex"
        aria-label="Search"
      >
        <Search className="size-4" aria-hidden />
        <span>Search…</span>
        <kbd className="ml-auto rounded border border-surface-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-copy-muted">
          ⌘K
        </kbd>
      </button>

      {/* < md: icon trigger opening the same dialog. */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setPaletteOpen(true)}
        className="size-11 md:hidden"
        aria-label="Search"
      >
        <Search className="size-5" />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setPaletteOpen}
        title="Search"
        description="Search modules, students, teachers, classes and more."
      >
        {/* Built-in filtering off: records are server-filtered, modules above. */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search modules, students, teachers…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {moduleResults.length > 0 && (
              <CommandGroup heading="Modules">
                {moduleResults.map((result) => (
                  <CommandItem
                    key={result.key}
                    value={result.value}
                    onSelect={() => onSelect(result)}
                  >
                    <result.icon
                      className="size-4 text-copy-muted"
                      aria-hidden
                    />
                    <span>{result.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {groups.map((group) => (
              <CommandGroup key={group.heading} heading={group.heading}>
                {group.results.map((result) => (
                  <CommandItem
                    key={result.key}
                    value={result.value}
                    onSelect={() => onSelect(result)}
                  >
                    <result.icon
                      className="size-4 text-copy-muted"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {result.label}
                    </span>
                    {result.sublabel && (
                      <span className="shrink-0 text-xs text-copy-muted">
                        {result.sublabel}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}

            {/* Loading: records are still in flight for an active query. */}
            {isLoading && (
              <div
                className="flex items-center justify-center gap-2 py-6 text-sm text-copy-muted"
                aria-busy
              >
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Searching…
              </div>
            )}

            {/* Empty: an active query that matched nothing the user can access. */}
            {showEmpty && (
              <CommandEmpty>
                {isActive
                  ? `No results for “${debounced.trim()}”.`
                  : "Type to search modules, students, teachers…"}
              </CommandEmpty>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
