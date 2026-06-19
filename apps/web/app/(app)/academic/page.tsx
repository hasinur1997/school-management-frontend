"use client"

/**
 * Academic structure management screen (task 2.2) — sessions, classes, and each
 * class's sections and subjects. Reads are open to all authenticated users; the
 * create/edit/delete actions inside are gated by `academic.manage`.
 *
 * The route is reachable directly, so it gates its own content on `academic.view`
 * and renders an access-denied state when the permission is absent rather than
 * partial UI (`code-standards.md`, Authorization). The API stays authoritative.
 */

import { Lock } from "lucide-react"

import { usePermission } from "@/hooks/auth/use-permission"
import { EmptyState } from "@/components/empty-state"
import { AcademicManagement } from "@/components/academic/management/academic-management"

export default function AcademicPage() {
  const canView = usePermission("academic.view")

  return (
    <div className="flex flex-col gap-6">
      <header className="min-w-0">
        <h1 className="truncate text-xl font-semibold text-copy-primary">
          Academic structure
        </h1>
        <p className="truncate text-sm text-copy-muted">
          Manage sessions, classes, sections, subjects, teacher assignments, and
          branches.
        </p>
      </header>

      {canView ? (
        <AcademicManagement />
      ) : (
        <EmptyState
          icon={Lock}
          title="You don't have access"
          description="You don't have permission to view the academic structure."
        />
      )}
    </div>
  )
}
