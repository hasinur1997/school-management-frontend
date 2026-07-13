import { Skeleton } from "@workspace/ui/components/skeleton"

/**
 * Route-level loading fallback for the TC detail screen (`ui-context.md`,
 * Feedback) — a back link + hero placeholder so navigation never blanks.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1080px]">
      <Skeleton className="mb-[18px] h-4 w-32" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="mt-5 h-56 w-full rounded-2xl" />
    </div>
  )
}
