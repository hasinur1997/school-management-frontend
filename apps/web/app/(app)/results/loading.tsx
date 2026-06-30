import { Skeleton } from "@workspace/ui/components/skeleton"
import { TableSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <TableSkeleton rows={6} columns={6} />
    </div>
  )
}
