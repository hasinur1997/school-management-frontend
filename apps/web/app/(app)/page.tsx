"use client"

/**
 * Dashboard — the role-aware landing screen (task 1.7) and the authenticated
 * root route (`/`). It renders summary
 * cards from `GET /dashboard` and nothing else: only the figures the API sends
 * for this user/branch, formatted client-side but never computed (see
 * `DashboardSummary`). For a super admin, the figures reflect the active branch
 * / consolidated selection from the shell and re-fetch when it changes.
 */

import { useAuth } from "@/components/auth/auth-provider"
import { DashboardSummary } from "@/components/dashboard/dashboard-summary"

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col gap-6">
      <header className="min-w-0">
        <h1 className="truncate text-xl font-semibold text-copy-primary">
          Welcome, {user.name}
        </h1>
        <p className="truncate text-sm text-copy-muted">
          Here&apos;s a summary for your account.
        </p>
      </header>

      <DashboardSummary />
    </div>
  )
}
