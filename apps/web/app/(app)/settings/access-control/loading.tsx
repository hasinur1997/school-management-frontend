import { CardSkeleton } from "@/components/skeletons"
import { Skeleton } from "@workspace/ui/components/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-11 w-72 rounded-[12px]" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[288px_1fr]">
        <CardSkeleton className="h-72" />
        <CardSkeleton className="min-h-[32rem]" />
      </div>
    </div>
  )
}
