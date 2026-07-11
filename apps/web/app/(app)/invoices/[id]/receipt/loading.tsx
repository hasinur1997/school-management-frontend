import { DetailLayout } from "@/components/detail/detail-ui"
import { DetailSkeleton } from "@/components/skeletons"

/**
 * Route-level loading fallback for the money-receipt view (`ui-context.md`,
 * Feedback) — mirrors the detail layout so navigation never blanks.
 */
export default function Loading() {
  return (
    <DetailLayout>
      <DetailSkeleton />
    </DetailLayout>
  )
}
