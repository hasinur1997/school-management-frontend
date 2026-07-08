"use client"

import * as React from "react"
import { Download, Printer, Share2 } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { Button } from "@/components/button"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  downloadMarkSheetPdf,
  printMarkSheetPdf,
  type MarkSheetDocData,
} from "./result-mark-sheet-document"
import {
  ResultMarkSheetFootnote,
  ResultMarkSheetPaper,
  resolveInstitution,
  type ResultMarkSheetPaperProps,
} from "./result-mark-sheet-paper"

/**
 * Official academic-transcript result sheet, reproducing the Bangladesh
 * Technical Education Board (BTEB) mark-sheet design: a patterned guilloche
 * border, parchment paper, a school seal, a serif institution header, a
 * grading legend, a bordered subjects table, a boxed GPA, signature lines, a
 * centered logo watermark, and a "no alteration" footnote.
 *
 * It is a fixed-palette paper document — it deliberately ignores the app's
 * light/dark theme so the transcript looks identical on screen and in print.
 * The same shared paper component now drives both the web view and the
 * client-side export renderer so layout details stay in sync while backend PDF
 * streaming remains blocked on task 8.4.
 */

export type {
  MarkSheetBorderTheme,
  MarkSheetDocumentStatus,
  MarkSheetField,
  MarkSheetSubject,
} from "./result-mark-sheet-paper"

export interface ResultMarkSheetProps extends ResultMarkSheetPaperProps {
  /**
   * Share handler. Defaults to a "coming soon" toast until the real share flow
   * is implemented.
   */
  onShare?: () => void
}

/** Coerce a field's node value to plain text for the download file name. */
function fieldText(value: React.ReactNode): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value)
  }
  return ""
}

export function ResultMarkSheet({
  schoolName,
  schoolAddress,
  schoolLogo,
  title,
  subtitle,
  examMonth,
  slNo,
  fields,
  scale,
  subjects,
  gpa,
  gpaLabel = "GPA",
  grade,
  passed,
  published,
  publishDate,
  issueDate,
  documentStatus,
  borderTheme = "plum",
  signature1,
  signature2,
  onShare,
  className,
}: ResultMarkSheetProps) {
  const [busy, setBusy] = React.useState<"download" | "print" | null>(null)
  const { name: institution, address: institutionAddress } = resolveInstitution(
    schoolName,
    schoolAddress
  )
  const paperProps: ResultMarkSheetPaperProps = {
    schoolName,
    schoolAddress,
    schoolLogo,
    title,
    subtitle,
    examMonth,
    slNo,
    fields,
    scale,
    subjects,
    gpa,
    gpaLabel,
    grade,
    passed,
    published,
    publishDate,
    issueDate,
    documentStatus,
    borderTheme,
    signature1,
    signature2,
  }

  function handleShare() {
    if (onShare) return onShare()
    toastSuccess("Result sharing will be available soon.", {
      id: "result-mark-sheet-share",
    })
  }

  function toDocData(): MarkSheetDocData {
    const safeName = fieldText(fields[0]?.value) || "result"
    return {
      schoolName: institution,
      schoolAddress: institutionAddress,
      schoolLogo,
      title,
      subtitle,
      examMonth,
      slNo,
      fields,
      scale,
      subjects,
      gpa,
      gpaLabel,
      grade,
      passed,
      published,
      publishDate,
      issueDate,
      documentStatus,
      borderTheme,
      signature1,
      signature2,
      fileName: `${safeName} - ${title}`.replace(/[^\w\- ]+/g, "").trim(),
    }
  }

  async function handleDownload() {
    if (busy) return
    setBusy("download")
    const ok = await downloadMarkSheetPdf(toDocData())
    setBusy(null)
    if (ok) {
      toastSuccess("Result sheet downloaded.", { id: "result-mark-sheet-pdf" })
    } else {
      toastError(null, "Couldn't generate the PDF. Please try again.", {
        id: "result-mark-sheet-pdf",
      })
    }
  }

  async function handlePrint() {
    if (busy) return
    setBusy("print")
    const ok = await printMarkSheetPdf(toDocData())
    setBusy(null)
    if (!ok) {
      toastError(null, "Couldn't open the print dialog. Please try again.", {
        id: "result-mark-sheet-print",
      })
    }
  }

  return (
    <div className={cn("flex w-full flex-col items-center", className)}>
      <div className="mb-4 flex w-full max-w-[850px] flex-wrap items-center justify-end gap-2 print:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleShare}
          disabled={busy !== null}
        >
          <Share2 className="size-4" aria-hidden />
          Share
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePrint}
          loading={busy === "print"}
          disabled={busy !== null}
        >
          {busy === "print" ? null : <Printer className="size-4" aria-hidden />}
          Print
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleDownload}
          loading={busy === "download"}
          disabled={busy !== null}
        >
          {busy === "download" ? null : (
            <Download className="size-4" aria-hidden />
          )}
          Download PDF
        </Button>
      </div>

      <div className="w-full max-w-[850px] shadow-[0_4px_26px_rgba(20,20,15,.18)]">
        <ResultMarkSheetPaper {...paperProps} />
      </div>

      <ResultMarkSheetFootnote className="mt-2.5 w-full max-w-[850px]" />
    </div>
  )
}
