import { Skeleton } from "@workspace/ui/components/skeleton"

/**
 * Route-level loading fallback for the documents screen (`ui-context.md`,
 * Feedback) — mirrors the header + generator card so navigation never blanks.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  )
}
