/**
 * Shared "detail page" design kit — the status-accented hero, icon-headed info
 * cards, and split label/value rows used across the admission, teacher, and
 * student detail screens. Mirrors the imported "Admission Detail" Claude Design
 * handoff, recreated with the app's design-system tokens (plus the three
 * lifecycle pastels, which aren't in the token set) so light/dark + accent
 * themes keep working.
 */

"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, MoreHorizontal } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Button, buttonVariants } from "@/components/button"
import { cn } from "@workspace/ui/lib/utils"
import type { StatusTone } from "@/components/status-badge"

const EMPTY = "—"

/** Reusable hero/Link action sizing — 40px tall, semibold, per the design. */
export const heroActionClass =
  "h-10 gap-[7px] rounded-[10px] px-4 text-sm font-semibold"

/**
 * Status accent for the hero (soft pill, avatar ring, top accent bar) keyed by
 * tone. `success`/`warning`/`error` carry the design's exact pastels with
 * dark-mode variants; `info`/`neutral` extend the same treatment.
 */
const TONE_ACCENT: Record<
  StatusTone,
  { pill: string; ring: string; bar: string }
> = {
  success: {
    pill: "bg-[#edfcf3] text-[#047857] border-[#a7f3cf] dark:bg-[#05281e] dark:text-[#34d399] dark:border-[#0a4534]",
    ring: "ring-[#6ee7b7] dark:ring-[#0f6149]",
    bar: "linear-gradient(90deg,#059669,#34d399)",
  },
  warning: {
    pill: "bg-[#fffbeb] text-[#b45309] border-[#fce7ad] dark:bg-[#2a2008] dark:text-[#fbbf24] dark:border-[#3b2c0a]",
    ring: "ring-[#fcd34d] dark:ring-[#7c5e10]",
    bar: "linear-gradient(90deg,#f59e0b,#fbbf24)",
  },
  error: {
    pill: "bg-[#fef2f2] text-[#dc2626] border-[#fecaca] dark:bg-[#2a0e0e] dark:text-[#f87171] dark:border-[#481717]",
    ring: "ring-[#fca5a5] dark:ring-[#7f2727]",
    bar: "linear-gradient(90deg,#dc2626,#f87171)",
  },
  info: {
    pill: "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe] dark:bg-[#0c1e33] dark:text-[#60a5fa] dark:border-[#15324f]",
    ring: "ring-[#93c5fd] dark:ring-[#1e4976]",
    bar: "linear-gradient(90deg,#2563eb,#60a5fa)",
  },
  neutral: {
    pill: "bg-subtle text-copy-secondary border-surface-border",
    ring: "ring-surface-border",
    bar: "linear-gradient(90deg,#9ca3af,#cbd5e1)",
  },
}

export function DetailLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-[1080px]">{children}</div>
}

export function DetailBackLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="mb-[18px] inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-copy-muted transition-colors hover:text-copy-primary"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {children}
    </Link>
  )
}

export interface DetailFact {
  label: string
  value?: string | null
  mono?: boolean
}

export function DetailHero({
  tone,
  statusLabel,
  photo,
  initials,
  title,
  subtitle,
  actions,
  facts,
}: {
  tone: StatusTone
  statusLabel: string
  photo?: string | null
  initials: string
  title: string
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  facts?: DetailFact[]
}) {
  const accent = TONE_ACCENT[tone]

  return (
    <div className="relative mb-5 overflow-hidden rounded-2xl border border-surface-border bg-surface px-6 py-6 shadow-lg">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: accent.bar }}
        aria-hidden
      />
      <div className="flex flex-col gap-5 pt-1.5 sm:flex-row sm:items-start sm:gap-5">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            className={cn(
              "size-[76px] shrink-0 rounded-2xl object-cover ring-[3px] ring-offset-[3px] ring-offset-surface",
              accent.ring
            )}
          />
        ) : (
          <div
            className={cn(
              "grid size-[76px] shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 text-2xl font-semibold text-white ring-[3px] ring-offset-[3px] ring-offset-surface",
              accent.ring
            )}
          >
            {initials}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="min-w-0 truncate text-2xl font-bold tracking-tight text-copy-primary">
              {title}
            </h1>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize",
                accent.pill
              )}
            >
              <span className="size-1.5 rounded-full bg-current" aria-hidden />
              {statusLabel}
            </span>
          </div>
          {subtitle ? <div className="mt-1 space-y-0.5">{subtitle}</div> : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2.5">
            {actions}
          </div>
        ) : null}
      </div>

      {facts && facts.length > 0 ? (
        <div className="mt-5 grid grid-cols-2 gap-y-4 border-t border-surface-border-subtle pt-[18px] sm:grid-cols-4 sm:gap-y-0 sm:divide-x sm:divide-surface-border-subtle">
          {facts.map((f) => (
            <div
              key={f.label}
              className="px-0 sm:px-5 sm:first:pl-0 sm:last:pr-0"
            >
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-copy-muted">
                {f.label}
              </div>
              <div
                className={cn(
                  "text-[15px] font-semibold text-copy-primary",
                  f.mono && "font-mono"
                )}
              >
                {f.value || EMPTY}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export interface DetailAction {
  key: string
  label: string
  icon: React.ElementType
  /** Navigation target — rendered as a link / `router.push` from the menu. */
  href?: string
  /** Click handler for non-navigation actions (opens a dialog, etc.). */
  onSelect?: () => void
  /**
   * Keep this action inline as the filled primary button (e.g. Edit). Every
   * other action collapses into the kebab overflow menu so the hero stays on a
   * single row regardless of how many actions a page has.
   */
  primary?: boolean
  /** Render as a destructive (red) menu item — e.g. Deactivate. */
  destructive?: boolean
  /** Draw a divider above this item, separating action groups in the menu. */
  separatorBefore?: boolean
}

/**
 * Hero action cluster: the `primary` actions render inline; the rest collapse
 * into a `⋮` overflow menu. Keeps the title on one line no matter how many
 * actions exist.
 */
export function DetailActions({ actions }: { actions: DetailAction[] }) {
  const router = useRouter()
  const inline = actions.filter((a) => a.primary)
  const menu = actions.filter((a) => !a.primary)

  if (actions.length === 0) return null

  return (
    <div className="flex shrink-0 items-center gap-2.5">
      {inline.map((a) =>
        a.href ? (
          <Link
            key={a.key}
            href={a.href}
            className={cn(buttonVariants(), heroActionClass)}
          >
            <a.icon className="size-4" aria-hidden />
            {a.label}
          </Link>
        ) : (
          <Button key={a.key} className={heroActionClass} onClick={a.onSelect}>
            <a.icon className="size-4" aria-hidden />
            {a.label}
          </Button>
        )
      )}

      {menu.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className={cn(heroActionClass, "w-10 px-0")}
                aria-label="More actions"
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end" sideOffset={6} className="w-56 p-1.5">
            <div className="px-2 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-copy-muted">
              Actions
            </div>
            {menu.map((a) => (
              <React.Fragment key={a.key}>
                {a.separatorBefore ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem
                  variant={a.destructive ? "destructive" : "default"}
                  className="gap-2.5 rounded-lg px-2 py-2 text-[13px] font-medium"
                  onClick={() => (a.href ? router.push(a.href) : a.onSelect?.())}
                >
                  <a.icon
                    className={cn("size-4", !a.destructive && "text-copy-muted")}
                    aria-hidden
                  />
                  {a.label}
                </DropdownMenuItem>
              </React.Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}

export function DetailCardHeader({
  icon: Icon,
  title,
  className,
  action,
}: {
  icon: React.ElementType
  title: string
  className?: string
  /** Optional control rendered at the far right of the header (e.g. Edit). */
  action?: React.ReactNode
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-brand-dim text-brand">
        <Icon className="size-[18px]" aria-hidden />
      </div>
      <span className="text-[15px] font-bold tracking-tight text-copy-primary">
        {title}
      </span>
      {action ? <div className="ml-auto shrink-0">{action}</div> : null}
    </div>
  )
}

export function DetailCard({
  icon,
  title,
  children,
  headerClassName,
  className,
  action,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
  headerClassName?: string
  className?: string
  /** Optional control rendered at the far right of the card header. */
  action?: React.ReactNode
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-surface-border bg-surface px-6 py-[22px] shadow-md",
        className
      )}
    >
      <DetailCardHeader
        icon={icon}
        title={title}
        action={action}
        className={cn("mb-2", headerClassName)}
      />
      <div>{children}</div>
    </section>
  )
}

export function DetailSubHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-0 pb-0.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-copy-muted">
      {children}
    </div>
  )
}

export function DetailRow({
  label,
  value,
  mono,
  valueClassName,
}: {
  label: string
  value?: string | null
  mono?: boolean
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-surface-border-subtle py-[13px] first:border-t-0">
      <span className="shrink-0 text-[13px] text-copy-muted">{label}</span>
      <span
        className={cn(
          "min-w-0 text-right text-sm font-medium text-copy-primary",
          mono && "font-mono",
          !value && "text-copy-muted",
          valueClassName
        )}
      >
        {value || EMPTY}
      </span>
    </div>
  )
}
