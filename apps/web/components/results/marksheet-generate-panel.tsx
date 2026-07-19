"use client"

/**
 * Marksheet tab on the student-detail page: pick a semester, generate, and
 * download the academic transcript as a PDF using the same BTEB-style sheet the
 * Results tab renders. The semester options mirror the three exams held per
 * session — First Semester, Second Semester, and Final — and only those with a
 * result in the enrollment bundle are selectable. Generation reuses the shared
 * `examToMarkSheetProps` adapter and the client-side PDF exporter, so the
 * downloaded sheet is pixel-identical to the on-screen transcript.
 */

import * as React from "react"
import { Download, FileText, Lock } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { useGradingScale } from "@/hooks/marks"
import { useEnrollmentResults } from "@/hooks/results"
import { toastError, toastSuccess } from "@/lib/toast"
import { EXAM_TYPE_LABELS, EXAM_TYPES, type ExamType } from "@/types/exam"
import type { ResultBundle } from "@/types/result"
import { downloadMarkSheetPdf } from "./result-mark-sheet-document"
import { examToMarkSheetProps } from "./result-mark-sheet-mapping"
import {
  ResultMarkSheetFootnote,
  ResultMarkSheetPaper,
  resolveInstitution,
} from "./result-mark-sheet-paper"
import { ResultsSkeleton } from "./result-bundle-panel"

function fieldText(value: React.ReactNode): string {
  if (typeof value === "string" || typeof value === "number") return String(value)
  return ""
}

/** The select + generate + live preview, once the result bundle is loaded. */
function MarksheetGenerator({ bundle }: { bundle: ResultBundle }) {
  const scale = useGradingScale().data
  const available = React.useMemo(
    () => EXAM_TYPES.filter((type) => bundle.exams.some((e) => e.type === type)),
    [bundle.exams]
  )
  const [semester, setSemester] = React.useState<ExamType | "">(
    () => available[0] ?? ""
  )
  const [busy, setBusy] = React.useState(false)

  const result = bundle.exams.find((e) => e.type === semester) ?? null
  const paperProps = result
    ? examToMarkSheetProps(result, bundle.student, scale)
    : null

  if (available.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No marksheet available"
        description="No published exam result exists for this enrollment yet, so there is nothing to generate."
      />
    )
  }

  async function handleGenerate() {
    if (busy || !paperProps || !result) return
    setBusy(true)
    const { name: institution, address } = resolveInstitution(
      paperProps.schoolName,
      paperProps.schoolAddress
    )
    const safeName = fieldText(paperProps.fields[0]?.value) || "result"
    const ok = await downloadMarkSheetPdf({
      ...paperProps,
      schoolName: institution,
      schoolAddress: address,
      fileName: `${safeName} - ${paperProps.title}`
        .replace(/[^\w\- ]+/g, "")
        .trim(),
    })
    setBusy(false)
    if (ok) {
      toastSuccess("Marksheet downloaded.", { id: "marksheet-generate" })
    } else {
      toastError(null, "Couldn't generate the marksheet. Please try again.", {
        id: "marksheet-generate",
      })
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-accent-dim text-brand">
            <FileText className="size-4" aria-hidden />
          </span>
          <div>
            <h3 className="text-base font-semibold text-copy-primary">
              Generate marksheet
            </h3>
            <p className="text-sm text-copy-muted">
              Select a semester and download the academic transcript as a PDF.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5 sm:w-64">
            <label
              htmlFor="marksheet-semester"
              className="text-[13px] font-semibold text-copy-secondary"
            >
              Semester
            </label>
            <Select
              value={semester}
              onValueChange={(value) => setSemester(value as ExamType)}
            >
              <SelectTrigger id="marksheet-semester" className="w-full">
                <SelectValue placeholder="Select semester">
                {(value) =>
                  EXAM_TYPE_LABELS[value as ExamType] ?? "Select semester"
                }
              </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {available.map((type) => (
                  <SelectItem key={type} value={type}>
                    {EXAM_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            onClick={handleGenerate}
            loading={busy}
            disabled={busy || !result}
          >
            {busy ? null : <Download className="size-4" aria-hidden />}
            Download
          </Button>
        </div>
      </section>

      {paperProps ? (
        <div className="flex w-full flex-col items-center">
          <div className="w-full max-w-[850px] shadow-[0_4px_26px_rgba(20,20,15,.18)]">
            <ResultMarkSheetPaper {...paperProps} />
          </div>
          <ResultMarkSheetFootnote className="mt-2.5 w-full max-w-[850px]" />
        </div>
      ) : null}
    </div>
  )
}

export function MarksheetGeneratePanel({
  enrollmentId,
}: {
  enrollmentId: string | null | undefined
}) {
  const query = useEnrollmentResults(enrollmentId)

  if (!enrollmentId) {
    return (
      <EmptyState
        icon={FileText}
        title="No enrollment selected"
        description="This student does not have an enrollment with results to generate a marksheet from."
      />
    )
  }

  if (query.isPending) return <ResultsSkeleton />
  if (query.isError) {
    return (
      <ErrorPanel
        icon={Lock}
        title="Couldn't load results"
        description={query.error.message}
        onRetry={() => query.refetch()}
      />
    )
  }

  return <MarksheetGenerator bundle={query.data} />
}
