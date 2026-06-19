import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Skeleton } from "@workspace/ui/components/skeleton"

/**
 * Reusable skeleton blocks that mirror the final layouts (`ui-context.md`,
 * Feedback/Loading) so initial data fetches never show a blank or bare spinner.
 * Used directly inside route-level `loading.tsx` files.
 */

export interface TableSkeletonProps extends React.ComponentProps<"div"> {
  rows?: number
  columns?: number
}

export function TableSkeleton({
  rows = 8,
  columns = 5,
  className,
  ...props
}: TableSkeletonProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-surface-border bg-surface",
        className
      )}
      aria-busy
      aria-live="polite"
      {...props}
    >
      <div className="flex items-center gap-4 border-b border-surface-border bg-subtle/40 px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-surface-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn("h-4 flex-1", c === 0 && "max-w-[40%]")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export interface CardSkeletonProps extends React.ComponentProps<"div"> {
  lines?: number
}

export function CardSkeleton({
  lines = 3,
  className,
  ...props
}: CardSkeletonProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-4",
        className
      )}
      aria-busy
      {...props}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3", i === lines - 1 && "w-2/3")} />
      ))}
    </div>
  )
}

export interface CardGridSkeletonProps extends React.ComponentProps<"div"> {
  count?: number
}

export function CardGridSkeleton({
  count = 6,
  className,
  ...props
}: CardGridSkeletonProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

export function DetailSkeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} aria-busy {...props}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-4 rounded-xl border border-surface-border bg-surface p-4"
          >
            <Skeleton className="h-4 w-32" />
            {Array.from({ length: 4 }).map((_, r) => (
              <div key={r} className="flex items-center justify-between gap-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
