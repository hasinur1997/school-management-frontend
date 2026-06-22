"use client"

/**
 * Admissions review queue route (task 2.6). The route is reachable directly, so
 * it gates its own content on `admissions.view` and renders an access-denied
 * state when the permission is absent rather than partial UI
 * (`code-standards.md`, Authorization). The API stays authoritative.
 *
 * Note: the public, unauthenticated admission form/status pages live outside the
 * `(app)` group at `/admissions/application` and `/admissions/status`; this
 * authenticated queue owns `/admissions` and `/admissions/{id}`.
 */

import { Lock } from "lucide-react"

import { usePermission } from "@/hooks/auth/use-permission"
import { EmptyState } from "@/components/empty-state"
import { AdmissionsList, ADMISSION_VIEW } from "@/components/admissions/review"

export default function AdmissionsPage() {
  const canView = usePermission(ADMISSION_VIEW)

  if (!canView) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to review admissions."
      />
    )
  }

  return <AdmissionsList />
}
