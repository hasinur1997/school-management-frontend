import { Skeleton } from "@workspace/ui/components/skeleton"
import { TableSkeleton } from "@/components/skeletons"

/**
 * Route-level loading fallback for attendance entry — mirrors the header,
 * selector panel, and roster table so navigation never shows a blank screen.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <TableSkeleton rows={8} columns={4} />
    </div>
  )
}
