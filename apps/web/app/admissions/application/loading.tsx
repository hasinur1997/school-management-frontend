import { Skeleton } from "@workspace/ui/components/skeleton"

/**
 * Route-level loading fallback for the public admission form (`ui-context.md`,
 * Feedback) — mirrors the standalone layout so navigation never blanks.
 */
export default function Loading() {
  return (
    <main className="min-h-svh bg-base px-4 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6" aria-busy>
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="size-12 rounded-2xl" />
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex flex-col gap-4 rounded-2xl border border-surface-border bg-surface p-6">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-10 w-32 self-end" />
        </div>
      </div>
    </main>
  )
}
