import { Skeleton } from "@workspace/ui/components/skeleton"
import { DetailSkeleton } from "@/components/skeletons"

/**
 * Route-level loading fallback for the admission detail (`ui-context.md`,
 * Feedback) — mirrors the back link + detail layout so navigation never blanks.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-32" />
      <DetailSkeleton />
    </div>
  )
}
