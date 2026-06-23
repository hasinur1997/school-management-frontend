import { Skeleton } from "@workspace/ui/components/skeleton"
import { CardGridSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>
      <CardGridSkeleton count={4} />
    </div>
  )
}
