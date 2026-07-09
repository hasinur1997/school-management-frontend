import { Skeleton } from "@workspace/ui/components/skeleton"
import { TableSkeleton } from "@/components/skeletons"

/**
 * Route-level loading fallback for the fee-structures list (`ui-context.md`,
 * Feedback) — mirrors the header + filter bar + table so navigation never blanks.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-14 w-full rounded-xl" />
      <TableSkeleton rows={8} columns={6} />
    </div>
  )
}
