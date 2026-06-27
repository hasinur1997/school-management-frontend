"use client"

/**
 * Admissions trash route. The soft-deleted application queue with restore +
 * permanent-delete actions. The route is reachable directly, so it gates its own
 * content on `admissions.manage` (the same permission that exposes the delete /
 * restore / force-delete actions) and renders an access-denied state when the
 * permission is absent rather than partial UI (`code-standards.md`,
 * Authorization). The API stays authoritative.
 *
 * This static `trash` segment sits beside the dynamic `[id]` detail route; Next
 * matches the static segment first, so `/admissions/trash` never resolves as an
 * application id.
 */

import { Lock } from "lucide-react"

import { usePermission } from "@/hooks/auth/use-permission"
import { EmptyState } from "@/components/empty-state"
import { AdmissionsTrash, ADMISSION_MANAGE } from "@/components/admissions/review"

export default function AdmissionsTrashPage() {
  const canManage = usePermission(ADMISSION_MANAGE)

  if (!canManage) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to manage deleted admissions."
      />
    )
  }

  return <AdmissionsTrash />
}
