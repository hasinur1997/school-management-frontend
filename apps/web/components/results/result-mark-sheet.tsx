"use client"

import * as React from "react"
import { Download, Printer, Share2 } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { Button } from "@/components/button"
import { toastError, toastSuccess } from "@/lib/toast"
import { EMPTY_VALUE } from "@/lib/format"
import type { GradingBand } from "@/types/mark"
import {
  downloadMarkSheetPdf,
  printMarkSheetPdf,
  type MarkSheetDocData,
} from "./result-mark-sheet-document"

/**
 * Official academic-transcript result sheet, reproducing the Bangladesh
 * Technical Education Board (BTEB) mark-sheet design: a patterned guilloché
 * border, parchment paper, a school seal, a serif institution header, a
 * grading legend, a bordered subjects table, a boxed GPA, signature lines, a
 * centered logo watermark, and a "no alteration" footnote.
 *
 * It is a fixed-palette *paper* document — it deliberately ignores the app's
 * light/dark theme so the transcript looks identical on screen and in print.
 * The same component serves all three surfaces (public lookup, admin result
 * search, student-detail semester result) via the flexible `fields`/`subjects`/
 * `scale`/`gpa` contract; result math and grading bands are server-owned.
 *
 * Print/Download rasterise a matching offscreen document (see
 * `result-mark-sheet-document.ts`); the toolbar hides from print output.
 */

/** One labelled row in the student-particulars column. */
export interface MarkSheetField {
  label: string
  value: React.ReactNode
  /** Render the value in tabular mono (roll numbers, ids, dates). */
  mono?: boolean
}

/** One subject line on the sheet. Columns render only when data is present. */
export interface MarkSheetSubject {
  code?: string | null
  name: string | null
  marks?: string | number | null
  /** Credit hours — BTEB sheets carry these; omitted when the API doesn't. */
  credit?: string | number | null
  grade?: string | null
  /** Grade point — omitted on the public sheet, present on staff/self sheets. */
  point?: string | number | null
}

/** Guilloché border palette — matches the Claude Design theme presets. */
export type MarkSheetBorderTheme = "sage" | "slate" | "sand" | "plum"

/** Copy states drive the diagonal watermark (Original prints none). */
export type MarkSheetDocumentStatus = "Original" | "Duplicate" | "Provisional"

export interface ResultMarkSheetProps {
  /**
   * Institution name for the header. Until the settings feature lands, an
   * unset name falls back to the default school (see `DEFAULT_SCHOOL_NAME`).
   */
  schoolName?: string | null
  /** Second header line (address). Defaults with the school when name is unset. */
  schoolAddress?: string | null
  /** Optional logo URL; replaces the embossed seal when provided. */
  schoolLogo?: string | null
  /** Main heading — usually the examination name (e.g. "First Semester"). */
  title: string
  /** Secondary line under the title — session, "held in", etc. */
  subtitle?: string | null
  /** Rendered as "(Held in the Month of …)" under the exam title. */
  examMonth?: string | null
  /** Serial number printed above the exam title. */
  slNo?: string | number | null
  fields: MarkSheetField[]
  /** Server-owned grading scale rendered as the range/grade/point legend. */
  scale?: GradingBand[]
  subjects: MarkSheetSubject[]
  /** Overall figure printed in the boxed GPA. */
  gpa?: string | number | null
  /** Label for the boxed figure. Defaults to "GPA". */
  gpaLabel?: string
  grade?: string | null
  /** Pass/fail verdict; drives the watermark when the result did not pass. */
  passed?: boolean | null
  /** Publication state; an unpublished result watermarks as "Provisional". */
  published?: boolean | null
  /** Footer publication date. */
  publishDate?: string | null
  /** Footer issue date. */
  issueDate?: string | null
  /** Forces the diagonal watermark; overrides the `published`/`passed` default. */
  documentStatus?: MarkSheetDocumentStatus
  /** Guilloché border colour preset. Defaults to "sage". */
  borderTheme?: MarkSheetBorderTheme
  /** Script signature over the "Compared by" line. */
  signature1?: string | null
  /** Script signature over the controller line. */
  signature2?: string | null
  /**
   * Share handler. Defaults to a "coming soon" toast until the real share flow
   * is implemented.
   */
  onShare?: () => void
  className?: string
}

// ---------------------------------------------------------------------------
// Fixed paper palette + typefaces (see the layout's next/font variables).
// ---------------------------------------------------------------------------

const SHEET = {
  ink: "#1a1a1a",
  paper: "#faf7ee",
  headerBar: "#efeadd",
  legendBorder: "#999999",
  subjectBorderStrong: "#444444",
  subjectBorder: "#666666",
  transcriptRed: "#7a1f1a",
  slPurple: "#5a1a78",
  noteRed: "#c0231e",
  signatureInk: "#1a1a3a",
  footerInk: "#333333",
}

const BORDER_THEMES: Record<
  MarkSheetBorderTheme,
  { pattern: string; line: string }
> = {
  sage: { pattern: "#96a488", line: "#5f6e52" },
  slate: { pattern: "#8090a8", line: "#4f5f7a" },
  sand: { pattern: "#a89478", line: "#7a6a4f" },
  plum: { pattern: "#9b7d94", line: "#6e5270" },
}

const FONT_SERIF = "var(--font-serif), 'EB Garamond', Georgia, serif"
const FONT_DISPLAY = "var(--font-serif-display), 'Playfair Display', Georgia, serif"
const FONT_SCRIPT = "var(--font-script), 'Caveat', cursive"

const DEFAULT_NOTE =
  "This Academic Transcript is issued without any alteration or erasure"

// Default institution shown until the settings feature supplies the real
// school name/logo. Matches the shipped school seal asset.
const DEFAULT_SCHOOL_NAME = "Hazi Jabed Ali Memorial School"
const DEFAULT_SCHOOL_ADDRESS = "Saratgonj, Chatmohar, Pabna"
const DEFAULT_SCHOOL_LOGO = "/branding/hjams-school-seal.svg"
const HEADER_LOGO_SIZE = 82
const GRADING_LEGEND_WIDTH = 260
const WATERMARK_LOGO_TOP = "44%"
const WATERMARK_TEXT_TOP = "56%"
const WATERMARK_LOGO_SIZE = 340
const WATERMARK_HALO_SIZE = 430
const WATERMARK_LOGO_OPACITY = 0.11

/** Resolve the header institution name + address, applying the default school. */
export function resolveInstitution(
  schoolName: string | null | undefined,
  schoolAddress: string | null | undefined
): { name: string; address: string | null } {
  const name = schoolName?.trim()
  if (name) return { name, address: schoolAddress?.trim() || null }
  return { name: DEFAULT_SCHOOL_NAME, address: DEFAULT_SCHOOL_ADDRESS }
}

function display(value: string | number | null | undefined): string {
  if (value == null || value === "") return EMPTY_VALUE
  return String(value)
}

/** Coerce a field's node value to plain text for the PDF payload. */
function fieldText(value: React.ReactNode): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value)
  }
  return ""
}

function formatPoint(value: string | number | null | undefined): string {
  if (value == null || value === "") return EMPTY_VALUE
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  return numeric.toFixed(2)
}

/** Resolve the diagonal watermark text, or null when none should show. */
function resolveWatermark(
  documentStatus: MarkSheetDocumentStatus | undefined,
  published: boolean | null | undefined,
  passed: boolean | null | undefined
): string | null {
  if (documentStatus && documentStatus !== "Original") return documentStatus
  if (documentStatus === "Original") return null
  if (published === false) return "PROVISIONAL"
  if (passed === false) return "FAILED"
  return null
}

function GradingLegend({ scale }: { scale: GradingBand[] }) {
  const ordered = [...scale].sort((a, b) => b.min_marks - a.min_marks)
  const cell: React.CSSProperties = {
    border: `1px solid ${SHEET.legendBorder}`,
    padding: "3px 8px",
    textAlign: "center",
  }
  const head: React.CSSProperties = {
    ...cell,
    background: SHEET.headerBar,
    fontWeight: 700,
    padding: "4px 8px",
  }
  return (
    <table
      style={{
        borderCollapse: "collapse",
        fontSize: 12,
        width: "100%",
        height: "100%",
      }}
    >
      <thead>
        <tr>
          <th style={head}>
            Range of Marks
            <br />
            (Percentage)
          </th>
          <th style={head}>Grade</th>
          <th style={head}>Point</th>
        </tr>
      </thead>
      <tbody>
        {ordered.map((band) => (
          <tr key={band.grade}>
            <td style={cell}>
              {band.min_marks} – {band.max_marks}
            </td>
            <td style={cell}>{band.grade}</td>
            <td style={cell}>{formatPoint(band.grade_point)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SubjectsTable({ subjects }: { subjects: MarkSheetSubject[] }) {
  const showMarks = subjects.some((s) => s.marks != null && s.marks !== "")
  const showCredit = subjects.some((s) => s.credit != null && s.credit !== "")
  const showPoint = subjects.some((s) => s.point != null && s.point !== "")
  const columnCount =
    2 + (showMarks ? 1 : 0) + (showCredit ? 1 : 0) + (showPoint ? 1 : 0)

  const headCell: React.CSSProperties = {
    border: `1.5px solid ${SHEET.subjectBorderStrong}`,
    padding: "8px 12px",
    background: SHEET.headerBar,
    fontWeight: 700,
    textAlign: "center",
  }
  const bodyCell: React.CSSProperties = {
    border: `1px solid ${SHEET.subjectBorder}`,
    padding: "8px 12px",
  }
  const bodyCenter: React.CSSProperties = { ...bodyCell, textAlign: "center" }

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        marginTop: 22,
        fontSize: 14.5,
      }}
    >
      <thead>
        <tr>
          <th style={headCell}>Subjects</th>
          {showMarks ? (
            <th style={{ ...headCell, width: 80 }}>Marks</th>
          ) : null}
          {showCredit ? (
            <th style={{ ...headCell, width: 80 }}>
              Credit
              <br />
              Hours
            </th>
          ) : null}
          <th style={{ ...headCell, width: 90 }}>
            Grade
            <br />
            Letter
          </th>
          {showPoint ? (
            <th style={{ ...headCell, width: 90 }}>
              Grade
              <br />
              Point
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {subjects.length === 0 ? (
          <tr>
            <td
              colSpan={columnCount}
              style={{ ...bodyCenter, padding: "24px 12px", color: "#555" }}
            >
              No subject marks were returned for this result.
            </td>
          </tr>
        ) : (
          subjects.map((subject, index) => {
            const label = subject.code
              ? `${subject.code} - ${subject.name ?? ""}`.trim()
              : subject.name || EMPTY_VALUE
            return (
              <tr key={`${subject.code ?? subject.name ?? "subject"}-${index}`}>
                <td style={bodyCell}>{label}</td>
                {showMarks ? (
                  <td style={bodyCenter}>{display(subject.marks)}</td>
                ) : null}
                {showCredit ? (
                  <td style={bodyCenter}>{display(subject.credit)}</td>
                ) : null}
                <td style={{ ...bodyCenter, fontWeight: 600 }}>
                  {display(subject.grade)}
                </td>
                {showPoint ? (
                  <td style={bodyCenter}>{formatPoint(subject.point)}</td>
                ) : null}
              </tr>
            )
          })
        )}
      </tbody>
    </table>
  )
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
  const theme = BORDER_THEMES[borderTheme] ?? BORDER_THEMES.sage
  const watermark = resolveWatermark(documentStatus, published, passed)
  const { name: institution, address: institutionAddress } = resolveInstitution(
    schoolName,
    schoolAddress
  )
  const resolvedSchoolLogo = schoolLogo?.trim() || DEFAULT_SCHOOL_LOGO

  function handleShare() {
    if (onShare) return onShare()
    toastSuccess("Result sharing will be available soon.", {
      id: "result-mark-sheet-share",
    })
  }

  /** Assemble the flat, string-valued document payload from the sheet props. */
  function toDocData(): MarkSheetDocData {
    const safeName = fieldText(fields[0]?.value) || "result"
    return {
      schoolName: institution,
      schoolAddress: institutionAddress,
      schoolLogo: resolvedSchoolLogo,
      title,
      subtitle,
      examMonth,
      slNo: slNo == null ? null : String(slNo),
      fields: fields.map((field) => ({
        label: field.label,
        value: fieldText(field.value),
      })),
      scale,
      subjects,
      gpa: gpa == null || gpa === "" ? "" : formatPoint(gpa),
      gpaLabel,
      grade,
      publishDate,
      issueDate,
      watermark,
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

  const guillochePattern =
    "repeating-linear-gradient(45deg, rgba(255,255,255,.32) 0 2px, transparent 2px 9px)," +
    "repeating-linear-gradient(-45deg, rgba(255,255,255,.32) 0 2px, transparent 2px 9px)"

  return (
    <div className={cn("flex w-full flex-col items-center", className)}>
      {/* Toolbar (hidden from print) */}
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

      {/* Sheet */}
      <div
        className="w-full max-w-[850px] shadow-[0_4px_26px_rgba(20,20,15,.18)]"
        style={{ color: SHEET.ink }}
      >
        {/* Guilloché border */}
        <div
          style={{
            backgroundColor: theme.pattern,
            backgroundImage: guillochePattern,
            padding: 22,
          }}
        >
          {/* Paper with inset hairline */}
          <div
            style={{ position: "relative", background: SHEET.paper, padding: 2 }}
          >
            <div
              style={{
                position: "absolute",
                inset: 6,
                border: `1px solid ${theme.line}`,
                pointerEvents: "none",
              }}
              aria-hidden
            />
            <div
              style={{
                position: "relative",
                padding: "34px clamp(20px, 5vw, 46px) 30px",
                fontFamily: FONT_SERIF,
                fontSize: 14.5,
                lineHeight: 1.4,
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: WATERMARK_LOGO_TOP,
                  left: "50%",
                  transform: "translate(-50%,-50%)",
                  width: WATERMARK_HALO_SIZE,
                  height: WATERMARK_HALO_SIZE,
                  display: "grid",
                  placeItems: "center",
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle, rgba(255,255,255,0) 34%, rgba(31,75,137,.04) 72%, rgba(53,182,87,.06) 100%)",
                  }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolvedSchoolLogo}
                  alt=""
                  style={{
                    width: WATERMARK_LOGO_SIZE,
                    height: WATERMARK_LOGO_SIZE,
                    objectFit: "contain",
                    opacity: WATERMARK_LOGO_OPACITY,
                  }}
                />
              </div>

              {/* Watermark */}
              {watermark ? (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: WATERMARK_TEXT_TOP,
                    left: "50%",
                    transform: "translate(-50%,-50%) rotate(-24deg)",
                    fontSize: 64,
                    fontWeight: 800,
                    color: "rgba(180,30,30,.13)",
                    letterSpacing: ".08em",
                    fontFamily: "var(--font-sans), sans-serif",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                    zIndex: 1,
                  }}
                >
                  {watermark}
                </div>
              ) : null}

              <div style={{ position: "relative", zIndex: 2 }}>
                {/* Header */}
                <div
                  style={{ display: "flex", alignItems: "flex-start", gap: 16 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolvedSchoolLogo}
                    alt=""
                    style={{
                      width: HEADER_LOGO_SIZE,
                      height: HEADER_LOGO_SIZE,
                      flex: "none",
                      objectFit: "contain",
                      marginTop: 4,
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      textAlign: "center",
                      paddingRight: HEADER_LOGO_SIZE,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontWeight: 700,
                        fontSize: 26,
                        lineHeight: 1.15,
                        letterSpacing: ".01em",
                      }}
                    >
                      {institution}
                      {institutionAddress ? (
                        <>
                          <br />
                          {institutionAddress}
                        </>
                      ) : null}
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        letterSpacing: ".14em",
                        color: SHEET.transcriptRed,
                        marginTop: 6,
                      }}
                    >
                      ACADEMIC TRANSCRIPT
                    </div>
                  </div>
                </div>

                {slNo != null && String(slNo) !== "" ? (
                  <div
                    style={{
                      marginTop: 16,
                      fontWeight: 700,
                      fontSize: 14.5,
                      color: SHEET.slPurple,
                    }}
                  >
                    SL No- <span style={{ letterSpacing: ".03em" }}>{slNo}</span>
                  </div>
                ) : null}

                <div style={{ textAlign: "center", marginTop: 24 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      letterSpacing: ".04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {title}
                  </div>
                  {examMonth ? (
                    <div
                      style={{
                        fontStyle: "italic",
                        fontSize: 13.5,
                        color: SHEET.footerInk,
                        marginTop: 3,
                      }}
                    >
                      (Held in the Month of {examMonth})
                    </div>
                  ) : subtitle ? (
                    <div
                      style={{
                        fontStyle: "italic",
                        fontSize: 13.5,
                        color: SHEET.footerInk,
                        marginTop: 3,
                      }}
                    >
                      {subtitle}
                    </div>
                  ) : null}
                </div>

                {/* Details + grading legend */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 22,
                    marginTop: 22,
                    alignItems: "stretch",
                  }}
                >
                  <div
                    style={{
                      flex: "1 1 320px",
                      fontSize: 14.5,
                      display: "flex",
                      flexDirection: "column",
                      gap: 9,
                    }}
                  >
                    {fields.map((field) => (
                      <div key={field.label} style={{ display: "flex" }}>
                        <span style={{ width: 150, flex: "none" }}>
                          {field.label}
                        </span>
                        <span
                          style={{
                            fontFamily: field.mono
                              ? "var(--font-mono), monospace"
                              : undefined,
                          }}
                        >
                          :&nbsp;&nbsp;
                          <b>{field.value || EMPTY_VALUE}</b>
                        </span>
                      </div>
                    ))}
                  </div>

                  {scale && scale.length > 0 ? (
                    <div
                      style={{
                        flex: `0 0 ${GRADING_LEGEND_WIDTH}px`,
                        width: GRADING_LEGEND_WIDTH,
                        display: "flex",
                      }}
                    >
                      <GradingLegend scale={scale} />
                    </div>
                  ) : null}
                </div>

                {/* Subjects */}
                <SubjectsTable subjects={subjects} />

                {/* GPA */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: 16,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 15 }}>
                      {gpaLabel} :
                    </span>
                    <span
                      style={{
                        border: "1.5px solid #333",
                        padding: "6px 20px",
                        fontWeight: 700,
                        fontSize: 15,
                        background: "#fff",
                        fontFamily: "var(--font-mono), monospace",
                      }}
                    >
                      {gpa == null || gpa === "" ? EMPTY_VALUE : formatPoint(gpa)}
                      {grade ? `  ${grade}` : ""}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    marginTop: 46,
                    fontSize: 13,
                    gap: 14,
                  }}
                >
                  <div>
                    <div>
                      Date of Publication of Result :{" "}
                      {publishDate || EMPTY_VALUE}
                    </div>
                    <div style={{ marginTop: 3 }}>
                      Date of Issue : {issueDate || EMPTY_VALUE}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    {signature1 ? (
                      <div
                        style={{
                          fontFamily: FONT_SCRIPT,
                          fontSize: 26,
                          color: SHEET.signatureInk,
                          transform: "rotate(-2deg)",
                        }}
                      >
                        {signature1}
                      </div>
                    ) : (
                      <div style={{ height: 30 }} aria-hidden />
                    )}
                    <div
                      style={{
                        borderTop: "1px solid #333",
                        paddingTop: 3,
                        marginTop: 2,
                        minWidth: 110,
                      }}
                    >
                      Compared by
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    {signature2 ? (
                      <div
                        style={{
                          fontFamily: FONT_SCRIPT,
                          fontSize: 28,
                          color: SHEET.signatureInk,
                          transform: "rotate(-3deg)",
                        }}
                      >
                        {signature2}
                      </div>
                    ) : (
                      <div style={{ height: 32 }} aria-hidden />
                    )}
                    <div
                      style={{
                        borderTop: "1px solid #333",
                        paddingTop: 3,
                        marginTop: 2,
                        minWidth: 200,
                      }}
                    >
                      Controller of Examinations
                      <br />
                      {institution}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footnote */}
      <div className="mt-2.5 w-full max-w-[850px] text-center">
        <span
          style={{
            color: SHEET.noteRed,
            fontSize: 12.5,
            fontFamily: FONT_SERIF,
            fontStyle: "italic",
          }}
        >
          {DEFAULT_NOTE}
        </span>
      </div>
    </div>
  )
}
