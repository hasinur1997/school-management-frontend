import * as React from "react"
import { Inbox, type LucideIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

export interface EmptyStateProps
  extends Omit<React.ComponentProps<"div">, "title"> {
  /** Glyph for the empty state; defaults to an inbox. */
  icon?: LucideIcon
  title: React.ReactNode
  description?: React.ReactNode
  /** Primary action, e.g. a "Create" button. */
  action?: React.ReactNode
}

/**
 * Purposeful empty state (icon + copy + action) per `ui-context.md` — lists,
 * tables, and detail sections that resolve to no data render this instead of a
 * blank area.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-surface-border bg-surface px-6 py-12 text-center",
        className
      )}
      {...props}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-subtle text-copy-muted">
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-sm font-medium text-copy-primary">{title}</p>
        {description ? (
          <p className="text-sm text-copy-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
