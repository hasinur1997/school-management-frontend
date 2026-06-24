"use client"

/**
 * Shared detail-page tab strip — a professional segmented tab bar that sits
 * below the detail hero and switches between content sections (Profile,
 * Attendance, …). The active tab is driven by a URL search param so it survives
 * a page refresh and is shareable/back-button friendly. Use with `useDetailTab`
 * to read the active key from the URL.
 *
 * The bar never scrolls: tabs that don't fit the available width collapse into a
 * trailing **More** dropdown (the "priority+" pattern), so a narrow / mobile
 * viewport shows as many tabs as fit plus a menu for the rest instead of a
 * horizontal scroll.
 */

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Check, ChevronDown } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { cn } from "@workspace/ui/lib/utils"

export interface DetailTab {
  key: string
  label: string
  icon?: React.ElementType
}

/**
 * Reads/writes the active tab from `?{param}=` in the URL. Defaults to the first
 * provided key when the param is absent or points at a tab the user can't see,
 * so the URL and the rendered content never disagree.
 */
export function useDetailTab(tabs: DetailTab[], param = "tab") {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const keys = tabs.map((t) => t.key)
  const fallback = keys[0] ?? ""
  const requested = searchParams.get(param)
  const active = requested && keys.includes(requested) ? requested : fallback

  const setActive = React.useCallback(
    (key: string) => {
      const next = new URLSearchParams(searchParams)
      // The first tab is the default — keep its URL clean (no param).
      if (key === fallback) next.delete(param)
      else next.set(param, key)
      const query = next.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      })
    },
    [router, pathname, searchParams, param, fallback]
  )

  return { active, setActive }
}

const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

// Geometry of the strip — kept in sync with the classes below so the width math
// matches what's painted: container padding (`p-1.5`) and inter-item gap.
const STRIP_PAD = 6
const STRIP_GAP = 4

export function DetailTabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: DetailTab[]
  active: string
  onChange: (key: string) => void
  className?: string
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const measureRef = React.useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = React.useState(tabs.length)

  // Measure natural tab widths against the available width and decide how many
  // fit; the rest overflow into the More menu. Re-runs whenever the bar resizes
  // or the tab set changes.
  useIsoLayoutEffect(() => {
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) return

    const recompute = () => {
      const items = Array.from(measure.children) as HTMLElement[]
      // The measurer renders every tab plus a trailing More button sample.
      const tabWidths = items.slice(0, tabs.length).map((el) => el.offsetWidth)
      const moreWidth = items[tabs.length]?.offsetWidth ?? 0
      const available = container.clientWidth - STRIP_PAD * 2

      const fits = (count: number, reserveMore: boolean) => {
        let total = reserveMore ? moreWidth + STRIP_GAP : 0
        for (let i = 0; i < count; i++) {
          total += tabWidths[i]! + (i > 0 || reserveMore ? STRIP_GAP : 0)
        }
        return total <= available
      }

      // Everything fits — no More button needed.
      if (fits(tabs.length, false)) {
        setVisibleCount(tabs.length)
        return
      }
      // Otherwise reserve room for More and take as many as still fit.
      let count = 0
      while (count < tabs.length && fits(count + 1, true)) count++
      setVisibleCount(Math.max(1, count))
    }

    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(container)
    return () => ro.disconnect()
  }, [tabs])

  const visible = tabs.slice(0, visibleCount)
  const overflow = tabs.slice(visibleCount)
  const activeInOverflow = overflow.some((t) => t.key === active)
  const activeTab = tabs.find((t) => t.key === active)

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        "relative mb-5 flex items-center gap-1 overflow-hidden rounded-xl border border-surface-border bg-surface p-1.5 shadow-sm",
        className
      )}
    >
      {visible.map((tab) => (
        <TabButton
          key={tab.key}
          tab={tab}
          selected={tab.key === active}
          onClick={() => onChange(tab.key)}
        />
      ))}

      {overflow.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="More tabs"
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold whitespace-nowrap transition-colors sm:min-h-10",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                  activeInOverflow
                    ? "bg-brand text-white shadow-sm"
                    : "text-copy-secondary hover:bg-subtle hover:text-copy-primary"
                )}
              >
                {activeInOverflow && activeTab ? activeTab.label : "More"}
                <ChevronDown className="size-4 shrink-0" aria-hidden />
              </button>
            }
          />
          <DropdownMenuContent align="end" sideOffset={6} className="w-52 p-1.5">
            {overflow.map((tab) => {
              const selected = tab.key === active
              const Icon = tab.icon
              return (
                <DropdownMenuItem
                  key={tab.key}
                  onClick={() => onChange(tab.key)}
                  className={cn(
                    "gap-2.5 rounded-lg px-2 py-2 text-[13px] font-medium",
                    selected && "text-brand"
                  )}
                >
                  {Icon ? (
                    <Icon
                      className={cn(
                        "size-4",
                        selected ? "text-brand" : "text-copy-muted"
                      )}
                      aria-hidden
                    />
                  ) : null}
                  <span className="flex-1">{tab.label}</span>
                  {selected ? <Check className="size-4" aria-hidden /> : null}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {/* Hidden measurer: natural-width copies of every tab + a More sample. */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute -left-[9999px] top-0 flex items-center"
      >
        {tabs.map((tab) => (
          <TabButton key={tab.key} tab={tab} selected={false} measuring />
        ))}
        <span className="inline-flex min-h-11 items-center gap-1.5 px-3 text-[13px] font-semibold whitespace-nowrap sm:min-h-10">
          More
          <span className="size-4" />
        </span>
      </div>
    </div>
  )
}

function TabButton({
  tab,
  selected,
  onClick,
  measuring,
}: {
  tab: DetailTab
  selected: boolean
  onClick?: () => void
  measuring?: boolean
}) {
  const Icon = tab.icon
  return (
    <button
      type="button"
      role={measuring ? undefined : "tab"}
      aria-selected={measuring ? undefined : selected}
      tabIndex={measuring ? -1 : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors sm:min-h-10",
        // Visible tabs spread to fill the bar; the measurer keeps natural width.
        !measuring && "sm:flex-1",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        selected
          ? "bg-brand text-white shadow-sm"
          : "text-copy-secondary hover:bg-subtle hover:text-copy-primary"
      )}
    >
      {Icon ? (
        <Icon
          className={cn(
            "size-4 shrink-0",
            selected ? "text-white" : "text-copy-muted"
          )}
          aria-hidden
        />
      ) : null}
      {tab.label}
    </button>
  )
}
