"use client"

/**
 * Documents module screen (feature-spec 17). Reachable directly, so it gates its
 * own content and renders an access-denied state when the user holds none of the
 * document permissions rather than partial UI (`code-standards.md`,
 * Authorization); the API stays authoritative. It hosts the class ID card batch
 * generator (task 6.1, `idcard.generate`) and the issued transfer certificates
 * list (task 6.2, `tc.view`) — each section renders only for the permission it
 * needs, so a user with just one still gets a useful page.
 */

import { FileText, Lock } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { usePermission } from "@/hooks/auth/use-permission"
import { IdCardBatch } from "./id-card-batch"
import { TcList } from "./tc-list"
import { IDCARD_GENERATE, TC_VIEW } from "./permissions"

export function DocumentsPage() {
  const canGenerate = usePermission(IDCARD_GENERATE)
  const canViewTc = usePermission(TC_VIEW)

  if (!canGenerate && !canViewTc) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description="You don't have permission to generate documents."
      />
    )
  }

  return (
    <div className="flex flex-col gap-8">
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
            Generate student ID cards for a whole class and browse the transfer
            certificates issued across the branch. Individual ID cards and TC
            issuance live on each student&apos;s profile.
          </p>
        </div>
      </div>

      {canGenerate ? <IdCardBatch /> : null}

      {canViewTc ? <TcList /> : null}
    </div>
  )
}
