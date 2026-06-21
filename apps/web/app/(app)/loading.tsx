import { TableSkeleton } from "@/components/skeletons"

/**
 * Loading fallback (Suspense) for the authenticated app group. Scoped here —
 * not at the root — so the table skeleton only shows for list-style app
 * segments, and so the root `not-found` boundary has no root-level loading
 * fallback to get stuck on during back-navigation (see `not-found.tsx`).
 * Every async route segment should ship its own `loading.tsx` mirroring its
 * final layout (`ui-context.md`, Feedback) so navigation never shows a blank
 * screen; this is the reusable default for list-style segments.
 */
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 sm:px-6">
      <TableSkeleton />
    </div>
  )
}
