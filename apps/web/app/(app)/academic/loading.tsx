import { Skeleton } from "@workspace/ui/components/skeleton"
import { TableSkeleton } from "@/components/skeletons"

/**
 * Route-level loading fallback for the academic screen (`ui-context.md`,
 * Feedback) — mirrors the header + tabbed list so navigation never blanks.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-8 w-48" />
      <TableSkeleton rows={5} columns={4} />
    </div>
  )
}
