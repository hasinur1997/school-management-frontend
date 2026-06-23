"use client"

/**
 * User profile route — the read-only profile linked from "recorded by" on the
 * attendance roster. Gated by `USER_VIEW` (`role.manage`); `params` is a promise
 * in the App Router, unwrapped with `React.use`.
 */

import * as React from "react"
import { Lock } from "lucide-react"

import { usePermission } from "@/hooks/auth/use-permission"
import { EmptyState } from "@/components/empty-state"
import { UserProfileView, USER_VIEW } from "@/components/users"

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)
  const canView = usePermission(USER_VIEW)

  if (!canView) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to view this user."
      />
    )
  }

  return <UserProfileView id={String(id)} />
}
