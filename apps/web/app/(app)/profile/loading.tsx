import { Skeleton } from "@workspace/ui/components/skeleton"
import { DetailSkeleton } from "@/components/skeletons"

/**
 * Route-level loading fallback for the profile screen (`ui-context.md`,
 * Feedback) — mirrors the header + content cards so navigation never blanks.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <DetailSkeleton />
    </div>
  )
}
