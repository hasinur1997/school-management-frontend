import { CardSkeleton } from "@/components/skeletons"
import { Skeleton } from "@workspace/ui/components/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-12 w-full max-w-2xl rounded-xl" />
      <CardSkeleton className="min-h-[28rem]" lines={6} />
    </div>
  )
}
