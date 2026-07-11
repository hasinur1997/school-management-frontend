import { Skeleton } from "@workspace/ui/components/skeleton"
import { TableSkeleton } from "@/components/skeletons"

/**
 * Route-level loading fallback for the finance screen (`ui-context.md`,
 * Feedback) — mirrors the header + tab bar + filter bar + table so navigation
 * never blanks.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-56 rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <TableSkeleton rows={8} columns={5} />
    </div>
  )
}
