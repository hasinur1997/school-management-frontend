"use client"

/**
 * Confirmation screen (task 2.5, steps 8/10). Terminal state for both the
 * payment-disabled path (straight from submit) and a settled payment. Shows the
 * `application_no`, the authoritative status (when relevant), and a "Download
 * Application" action.
 *
 * The PDF is produced client-side from the submitted snapshot (laid out like the
 * Preview) since the server PDF route isn't available yet; when no snapshot is
 * present (e.g. resuming after a gateway redirect) it falls back to the
 * server-generated PDF URL.
 */

import * as React from "react"
import { Download, CheckCircle2, FileWarning } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { buttonVariants } from "@workspace/ui/components/button"
import { API_BASE_URL } from "@/lib/api"
import { Button } from "@/components/button"
import { StatusBadge } from "@/components/status-badge"
import { toastError } from "@/lib/toast"
import type { AdmissionStatus } from "@/types/admission"
import {
  downloadApplicationPdf,
  type ApplicationSnapshot,
} from "./application-document"

/** Generates and downloads the application PDF directly; shows a busy state. */
function DownloadApplicationButton({ snapshot }: { snapshot: ApplicationSnapshot }) {
  const [busy, setBusy] = React.useState(false)
  return (
    <Button
      variant="outline"
      loading={busy}
      onClick={async () => {
        setBusy(true)
        try {
          const ok = await downloadApplicationPdf(snapshot)
          if (!ok) {
            toastError(null, "Couldn't generate the application. Please try again.", {
              id: "admission-pdf",
            })
          }
        } finally {
          setBusy(false)
        }
      }}
    >
      {busy ? null : <Download className="size-4" aria-hidden />}
      {busy ? "Preparing…" : "Download Application"}
    </Button>
  )
}

export interface ConfirmationScreenProps {
  applicationNo: string
  status?: AdmissionStatus | null
  /** Show the status badge (payment paths) vs. a plain "submitted" message. */
  showStatus?: boolean
  /** Terminal failure variant — payment exhausted its retries. */
  failed?: boolean
  /** Submitted data for the client-side download; absent when resuming. */
  snapshot?: ApplicationSnapshot | null
}

/** Public PDF URL — prefer the status payload's link, else the documented route. */
function pdfUrl(applicationNo: string, status?: AdmissionStatus | null): string {
  return (
    status?.pdf_url ||
    `${API_BASE_URL}/public/admissions/${encodeURIComponent(applicationNo)}/pdf`
  )
}

export function ConfirmationScreen({
  applicationNo,
  status,
  showStatus = false,
  failed = false,
  snapshot,
}: ConfirmationScreenProps) {
  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <span
        className={
          failed
            ? "flex size-14 items-center justify-center rounded-full bg-error/10 text-error"
            : "flex size-14 items-center justify-center rounded-full bg-success/10 text-success"
        }
      >
        {failed ? (
          <FileWarning className="size-7" aria-hidden />
        ) : (
          <CheckCircle2 className="size-7" aria-hidden />
        )}
      </span>

      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-copy-primary">
          {failed ? "Payment could not be completed" : "Application submitted"}
        </h2>
        <p className="max-w-md text-sm text-copy-muted">
          {failed
            ? "We couldn't confirm your payment after several attempts. The school office will follow up with you about your application."
            : "Your admission application has been received. Keep your application number for future reference."}
        </p>
      </div>

      <div className="flex flex-col items-center gap-2 rounded-xl border border-surface-border bg-surface px-6 py-4">
        <span className="text-xs uppercase tracking-wide text-copy-muted">
          Application number
        </span>
        <span className="font-mono text-xl font-semibold tabular-nums text-copy-primary">
          {applicationNo}
        </span>
        {showStatus && status ? (
          <StatusBadge status={status.status} label={status.status.replace(/_/g, " ")} />
        ) : null}
      </div>

      {snapshot ? (
        <DownloadApplicationButton snapshot={snapshot} />
      ) : (
        <a
          href={pdfUrl(applicationNo, status)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <Download className="size-4" aria-hidden />
          Download Application
        </a>
      )}
    </div>
  )
}
