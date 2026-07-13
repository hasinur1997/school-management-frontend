"use client"

/**
 * Transfer certificate tab on the student detail (task 6.2). Two faces of one
 * lifecycle, driven off the student's status — the status is reflected, never
 * special-cased:
 *
 *  - **Live student** (not yet TC): staff with `tc.issue` get an "Issue
 *    transfer certificate" action behind an explicit, irreversible confirmation
 *    (`IssueTcDialog`). On issue, the certificate downloads as a client-rendered
 *    PDF (matching the imported design) and the student caches invalidate,
 *    flipping the profile to TC.
 *  - **TC student**: the issued certificate is rendered as a live, pixel-exact
 *    preview of the design with download / print (`TcCertificateView`) — the TC
 *    is the one stored document, surfaced from the profile thereafter (ticket).
 *    The lookup needs `tc.view`; a viewer without it (e.g. a linked parent) sees
 *    the issued note only.
 */

import * as React from "react"
import Link from "next/link"
import { Loader2, Lock, ScrollText } from "lucide-react"

import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { DetailCard } from "@/components/detail/detail-ui"
import { usePermission } from "@/hooks/auth/use-permission"
import { useTcs } from "@/hooks/documents"
import { studentDisplayName, type Student } from "@/types/student"
import type { TransferCertificate } from "@/types/document"
import { IssueTcDialog } from "./issue-tc-dialog"
import { TcCertificateView } from "./tc-certificate-view"
import { buildTcPaperData, downloadTcPdf } from "./tc-document"
import { TC_ISSUE, TC_VIEW } from "./permissions"

/**
 * Renders the issued certificate (the design preview + PDF actions). Split out so
 * the `tc.view`-gated lookup only runs for a retired student.
 */
function IssuedTc({ student }: { student: Student }) {
  // Find this student's TC via the branch list, keyed on the (unique) admission
  // number, falling back to the name. Newest-first, so the first row matching
  // the student is the current certificate.
  const searchTerm = student.admission_no ?? student.name_en ?? ""
  const { data, isPending, isError, refetch } = useTcs({
    search: searchTerm,
    per_page: 20,
  })

  const tc = React.useMemo<TransferCertificate | null>(() => {
    const rows = data?.data ?? []
    return rows.find((row) => row.student?.id === student.id) ?? null
  }, [data, student.id])

  if (isPending) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-surface-border bg-surface px-4 py-6 text-sm text-copy-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading transfer certificate…
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorPanel
        description="We couldn't load this student's transfer certificate."
        onRetry={() => void refetch()}
      />
    )
  }

  if (!tc) {
    // The student is retired to TC but the certificate isn't in the list (an
    // out-of-branch record, or a search miss). Point to the full TC list.
    return (
      <EmptyState
        icon={ScrollText}
        title="Certificate issued"
        description="This student holds a transfer certificate. Open the Documents area to find and download it."
      />
    )
  }

  const data2 = buildTcPaperData(tc, student)

  return (
    <div className="flex flex-col gap-3">
      <TcCertificateView data={data2} fileName={`tc-${tc.tc_no}`} />
      <Link
        href={`/documents/tcs/${tc.id}`}
        className="text-sm font-medium text-brand hover:underline"
      >
        Open the full certificate record
      </Link>
    </div>
  )
}

export function StudentTcPanel({ student }: { student: Student }) {
  const canIssue = usePermission(TC_ISSUE)
  const canView = usePermission(TC_VIEW)
  const [issueOpen, setIssueOpen] = React.useState(false)

  const isTc = student.status === "tc"

  // After issuing, download the certificate as the client-rendered PDF built
  // from the returned TC + this full profile (the profile refresh is driven by
  // the mutation's cache invalidation).
  async function handleIssued(tc: TransferCertificate) {
    await downloadTcPdf(buildTcPaperData(tc, student), `tc-${tc.tc_no}`)
  }

  if (isTc) {
    if (!canView) {
      return (
        <EmptyState
          icon={ScrollText}
          title="Transfer certificate issued"
          description="This student has been issued a transfer certificate and is excluded from active operations."
        />
      )
    }
    return <IssuedTc student={student} />
  }

  // Live student — issuing is staff-only.
  if (!canIssue) {
    return (
      <EmptyState
        icon={Lock}
        title="No transfer certificate"
        description="This student is active. Transfer certificates are issued by staff."
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <DetailCard icon={ScrollText} title="Transfer certificate">
        <p className="text-sm text-copy-secondary">
          Issuing a transfer certificate retires this student — the status moves
          to <span className="font-medium text-copy-primary">TC</span> and they
          are excluded from attendance, invoicing, and promotion. This can&apos;t
          be undone.
        </p>
        <div className="pt-4">
          <Button type="button" onClick={() => setIssueOpen(true)}>
            <ScrollText className="size-4" aria-hidden />
            Issue transfer certificate
          </Button>
        </div>
      </DetailCard>

      <IssueTcDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        studentId={student.id}
        studentName={studentDisplayName(student)}
        onIssued={handleIssued}
      />
    </div>
  )
}
