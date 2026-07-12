"use client"

/**
 * Documents module screen (feature-spec 17). Reachable directly, so it gates its
 * own content and renders an access-denied state when the permission is absent
 * rather than partial UI (`code-standards.md`, Authorization); the API stays
 * authoritative. Today it hosts the class ID card batch generator (task 6.1);
 * transfer certificates land here as a later task.
 */

import { FileText, Lock } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { usePermission } from "@/hooks/auth/use-permission"
import { IdCardBatch } from "./id-card-batch"
import { IDCARD_GENERATE } from "./permissions"

export function DocumentsPage() {
  const canGenerate = usePermission(IDCARD_GENERATE)

  if (!canGenerate) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to generate documents."
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-copy-muted">
          <FileText className="size-4" aria-hidden />
          Documents
        </div>
        <div>
          <h1 className="text-[27px] font-bold tracking-[-0.025em] text-copy-primary">
            Documents
          </h1>
          <p className="max-w-2xl text-sm text-copy-muted">
            Generate student ID cards for a whole class as a single PDF. Individual
            cards are available from each student&apos;s profile.
          </p>
        </div>
      </div>

      <IdCardBatch />
    </div>
  )
}
