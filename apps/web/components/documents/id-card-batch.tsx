"use client"

/**
 * Class ID card batch generator (task 6.1). Picks a session + class (optionally
 * one section), queues a batch (`POST /id-cards/batch`, 202), then polls
 * `GET /id-cards/batch/{batch}` with backoff while it builds — showing a live
 * progress indicator — and downloads the merged PDF once `done`. Generation is
 * gated on `idcard.generate`; the streamed PDF is never rendered client-side.
 *
 * The batch id drives the poll; changing the selection after queuing is only
 * possible once the current batch settles (a fresh queue replaces the id).
 *
 * Super admins scope the class list through the global topbar branch switcher —
 * there's no screen-local branch filter, since the batch endpoint keys the
 * cohort off the caller's branch (mirrors the finance screen's decision in 5.4).
 */

import * as React from "react"
import {
  CheckCircle2,
  Download,
  IdCard,
  Loader2,
  RotateCcw,
  TriangleAlert,
} from "lucide-react"

import { ClassSelect } from "@/components/academic/class-select"
import { SectionSelect } from "@/components/academic/section-select"
import { SessionSelect } from "@/components/academic/session-select"
import { Button } from "@/components/button"
import {
  useCreateIdCardBatch,
  useDownloadIdCardBatch,
  useIdCardBatchStatus,
} from "@/hooks/documents"
import { getErrorMessage, toastError, toastSuccess } from "@/lib/toast"
import type { IdCardBatchStatus } from "@/types/document"

export function IdCardBatch() {
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [classId, setClassId] = React.useState<string | null>(null)
  const [sectionId, setSectionId] = React.useState<string | null>(null)

  // The queued batch we're polling; null before the first queue or after reset.
  const [batchId, setBatchId] = React.useState<string | null>(null)

  const create = useCreateIdCardBatch()
  const statusQuery = useIdCardBatchStatus(batchId)
  const download = useDownloadIdCardBatch()

  const state = statusQuery.data
  const status: IdCardBatchStatus | null = state?.status ?? null
  const ready = Boolean(sessionId && classId)
  // Lock the pickers while a batch is queued/processing so the poll target and
  // the selection can't drift apart mid-build.
  const busy = create.isPending || (batchId !== null && status !== "done" && status !== "failed")

  function changeClass(value: string | null) {
    setClassId(value)
    setSectionId(null)
  }

  function reset() {
    setBatchId(null)
  }

  async function onGenerate() {
    if (!sessionId || !classId) return
    setBatchId(null)
    try {
      const created = await create.mutateAsync({
        class_id: classId,
        section_id: sectionId,
        session_id: sessionId,
      })
      setBatchId(created.batch_id)
    } catch (error) {
      toastError(error, "Couldn't queue the ID card batch.", {
        id: "id-card-batch",
      })
    }
  }

  async function onDownload() {
    if (!batchId) return
    try {
      await download.mutateAsync(batchId)
      toastSuccess("ID cards downloaded.", { id: "id-card-batch-download" })
    } catch (error) {
      toastError(error, "Couldn't download the ID cards.", {
        id: "id-card-batch-download",
      })
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-brand-dim text-brand">
            <IdCard className="size-[18px]" aria-hidden />
          </div>
          <div>
            <h2 className="text-[15px] font-bold tracking-tight text-copy-primary">
              Class ID cards
            </h2>
            <p className="text-sm text-copy-muted">
              Generate every active student&apos;s ID card for a class as one PDF.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-copy-muted">
              Session
            </span>
            <SessionSelect
              value={sessionId}
              onValueChange={setSessionId}
              disabled={busy}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-copy-muted">
              Class
            </span>
            <ClassSelect
              value={classId}
              onValueChange={changeClass}
              disabled={busy}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-copy-muted">
              Section (optional)
            </span>
            <SectionSelect
              classId={classId}
              value={sectionId}
              onValueChange={setSectionId}
              clearLabel="All sections"
              placeholder="All sections"
              disabled={busy}
            />
          </label>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={onGenerate}
              disabled={!ready || busy}
              loading={create.isPending}
              className="w-full sm:w-auto"
            >
              <IdCard className="size-4" aria-hidden />
              Generate ID cards
            </Button>
          </div>
        </div>
      </div>

      <BatchProgress
        active={batchId !== null}
        status={status}
        isError={statusQuery.isError}
        errorMessage={
          status === "failed"
            ? state?.message
            : statusQuery.isError
              ? getErrorMessage(statusQuery.error, "Couldn't check the batch status.")
              : undefined
        }
        downloading={download.isPending}
        onDownload={onDownload}
        onRetryStatus={() => void statusQuery.refetch()}
        onReset={reset}
      />
    </section>
  )
}

function BatchProgress({
  active,
  status,
  isError,
  errorMessage,
  downloading,
  onDownload,
  onRetryStatus,
  onReset,
}: {
  active: boolean
  status: IdCardBatchStatus | null
  isError: boolean
  errorMessage?: string
  downloading: boolean
  onDownload: () => void
  onRetryStatus: () => void
  onReset: () => void
}) {
  if (!active) return null

  // A transport error on the poll itself (not a `failed` batch) — offer a retry.
  if (isError && status !== "failed") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-error/30 bg-error/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5 text-sm text-error">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{errorMessage}</span>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onRetryStatus}>
            <RotateCcw className="size-4" aria-hidden />
            Retry
          </Button>
          <Button type="button" variant="ghost" onClick={onReset}>
            Dismiss
          </Button>
        </div>
      </div>
    )
  }

  if (status === "failed") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-error/30 bg-error/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5 text-sm text-error">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{errorMessage ?? "ID card batch generation failed."}</span>
        </div>
        <Button type="button" variant="outline" onClick={onReset}>
          <RotateCcw className="size-4" aria-hidden />
          Start over
        </Button>
      </div>
    )
  }

  if (status === "done") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-success/30 bg-success/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5 text-sm text-copy-secondary">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <span>The ID cards are ready to download.</span>
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={onDownload} loading={downloading}>
            <Download className="size-4" aria-hidden />
            Download ID cards
          </Button>
          <Button type="button" variant="ghost" onClick={onReset} disabled={downloading}>
            New batch
          </Button>
        </div>
      </div>
    )
  }

  // Queued / processing — indeterminate progress (the API reports no count).
  return (
    <div
      className="flex items-center gap-2.5 rounded-xl border border-surface-border bg-surface p-4 text-sm text-copy-secondary"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-4 shrink-0 animate-spin text-brand" aria-hidden />
      <span>Generating ID cards… this can take a moment for a large class.</span>
    </div>
  )
}
