"use client"

/**
 * Transfer certificate detail route (task 6.2). Reachable directly, so it gates
 * on `tc.view` and renders an access-denied state when the permission is absent
 * rather than partial UI (`code-standards.md`, Authorization). The API stays
 * authoritative (an out-of-branch id is hidden as `404` inside `TcDetail`).
 *
 * `params` is a promise, unwrapped with `React.use`.
 */

import * as React from "react"
import { Lock } from "lucide-react"

import { usePermission } from "@/hooks/auth/use-permission"
import { EmptyState } from "@/components/empty-state"
import { TcDetail, TC_VIEW } from "@/components/documents"

export default function TcDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)
  const canView = usePermission(TC_VIEW)

  if (!canView) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to view transfer certificates."
      />
    )
  }

  return <TcDetail id={String(id)} />
}
