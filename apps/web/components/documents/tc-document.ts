/**
 * Client-side transfer certificate PDF (task 6.2). Renders the on-screen
 * `TcPaper` into a single content-fit A4 page via the shared `paper-pdf`
 * renderer, so the downloaded/printed certificate matches the imported design —
 * and the live preview — exactly. The page carries `invoice-paper-root`, so the
 * renderer flattens its border/radius/shadow for a clean, full-bleed document.
 *
 * `buildTcPaperData` maps the certificate + the full student profile onto the
 * design's fields. Fields the data model doesn't track (conduct, last exam,
 * promoted-to) render as the empty marker rather than being invented; the date
 * of leaving is the issue date (the day the student is retired).
 */

import * as React from "react"

import { downloadPaperPdf, printPaperPdf } from "@/components/invoices/paper-pdf"
import type { Student } from "@/types/student"
import type { TransferCertificate } from "@/types/document"
import { TcPaper, TC_PAPER_WIDTH, type TcPaperData } from "./tc-paper"

const EMPTY = "—"

/** Long date form matching the design ("12 July 2026"); empty marker on miss. */
const LONG_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

function longDate(value: string | null | undefined): string {
  if (!value) return EMPTY
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return EMPTY
  return LONG_DATE.format(date)
}

/** The enrollment backing the certificate (the TC one, else active, else first). */
function certificateEnrollment(student: Student | undefined) {
  return (
    student?.enrollments?.find((e) => e.status === "tc") ??
    student?.enrollments?.find((e) => e.status === "active") ??
    student?.enrollments?.[0] ??
    null
  )
}

/**
 * Build the certificate's fields from the TC and, when available, the full
 * student profile (date of birth / admission date live only there — the TC's
 * embedded student summary doesn't carry them).
 */
export function buildTcPaperData(
  tc: TransferCertificate,
  student?: Student
): TcPaperData {
  const enrollment = certificateEnrollment(student)

  // Class + section, preferring the full profile's enrollment, then the TC's
  // embedded summary.
  const className =
    enrollment?.class?.name && enrollment.section?.name
      ? `${enrollment.class.name}, Section ${enrollment.section.name}`
      : enrollment?.class?.name ??
        (tc.student.class
          ? tc.student.section
            ? `${tc.student.class}, Section ${tc.student.section}`
            : tc.student.class
          : EMPTY)

  const roll =
    enrollment?.roll_no != null
      ? String(enrollment.roll_no)
      : tc.student.roll_no != null
        ? String(tc.student.roll_no)
        : EMPTY

  return {
    refNo: tc.tc_no,
    issueDate: longDate(tc.issue_date),
    studentName: student?.name_en ?? tc.student.name_en,
    fatherName: student?.father_name_en ?? EMPTY,
    motherName: student?.mother_name_en ?? EMPTY,
    studentId: tc.student.admission_no ?? student?.admission_no ?? EMPTY,
    dateOfBirth: longDate(student?.date_of_birth),
    className,
    roll,
    admissionDate: longDate(student?.admitted_at),
    // Not tracked separately — the student leaves the day the TC is issued.
    leavingDate: longDate(tc.issue_date),
    // Not part of the data model; shown as the empty marker, never invented.
    lastExam: EMPTY,
    promotedTo: EMPTY,
    conduct: EMPTY,
    reason: tc.reason,
  }
}

function element(data: TcPaperData): React.ReactElement {
  return React.createElement(TcPaper, { data })
}

/** Generate the TC PDF and download it directly. */
export function downloadTcPdf(
  data: TcPaperData,
  fileName: string
): Promise<boolean> {
  return downloadPaperPdf(element(data), TC_PAPER_WIDTH, fileName)
}

/** Generate the TC PDF and open the browser print dialog. */
export function printTcPdf(
  data: TcPaperData,
  fileName: string
): Promise<boolean> {
  return printPaperPdf(element(data), TC_PAPER_WIDTH, fileName)
}
