import { Skeleton } from "@workspace/ui/components/skeleton"

/**
 * Route-level loading fallback for the public status-check page (`ui-context.md`,
 * Feedback) — mirrors the standalone layout (soft gradient + centered card) so
 * navigation never blanks.
 */
export default function Loading() {
  return (
    <main className="min-h-svh bg-linear-to-b from-base to-subtle px-5 py-12">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-7" aria-busy>
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="size-13 rounded-xl" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="w-full overflow-hidden rounded-xl border border-surface-border bg-surface p-8">
          <div className="flex flex-col gap-5">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </main>
  )
}
