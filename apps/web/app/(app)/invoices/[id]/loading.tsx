import { DetailLayout } from "@/components/detail/detail-ui"
import { DetailSkeleton } from "@/components/skeletons"

/**
 * Route-level loading fallback for the invoice detail (`ui-context.md`,
 * Feedback) — mirrors the detail hero + cards so navigation never blanks.
 */
export default function Loading() {
  return (
    <DetailLayout>
      <DetailSkeleton />
    </DetailLayout>
  )
}
