import { Skeleton } from "@workspace/ui/components/skeleton"

export default function Loading() {
  return (
    <main className="min-h-svh bg-base px-4 py-8 sm:py-12">
      <div className="mx-auto grid w-full max-w-6xl gap-5" aria-busy>
        <div className="rounded-[20px] border border-surface-border bg-surface p-5 sm:p-7">
          <div className="grid gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)_9rem_12rem_auto]">
            <Skeleton className="h-18 rounded-xl" />
            <Skeleton className="h-18 rounded-xl" />
            <Skeleton className="h-18 rounded-xl" />
            <Skeleton className="h-18 rounded-xl" />
            <Skeleton className="h-18 rounded-xl" />
            <Skeleton className="h-11 rounded-lg" />
          </div>
        </div>
        <div className="rounded-[20px] border border-surface-border bg-surface p-5 sm:p-7">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="mt-4 h-64 rounded-xl" />
        </div>
      </div>
    </main>
  )
}
