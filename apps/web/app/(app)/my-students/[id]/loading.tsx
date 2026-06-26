import { Skeleton } from "@workspace/ui/components/skeleton"
import { DetailSkeleton } from "@/components/skeletons"

/**
 * Route-level loading fallback for the parent student detail — mirrors the back
 * link + profile layout so navigation never blanks (`ui-context.md`, Feedback).
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-32" />
      <DetailSkeleton />
    </div>
  )
}
