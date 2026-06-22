"use client"

/**
 * Admission review detail route (task 2.6). Gates on `admissions.view`; an
 * invalid id or out-of-branch record surfaces as not-found inside
 * `AdmissionDetail`. `params` is a promise in the App Router, unwrapped with
 * `React.use`.
 */

import * as React from "react"
import { Lock } from "lucide-react"

import { usePermission } from "@/hooks/auth/use-permission"
import { EmptyState } from "@/components/empty-state"
import { AdmissionDetail, ADMISSION_VIEW } from "@/components/admissions/review"

export default function AdmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)
  const canView = usePermission(ADMISSION_VIEW)
  const admissionId = String(id)

  if (!canView) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to review admissions."
      />
    )
  }

  if (typeof admissionId !== 'string') {
    return (
      <EmptyState
        title="Application not found"
        description="This application reference is invalid."
      />
    )
  }

  return <AdmissionDetail id={admissionId} />
}
