/**
 * Client-side academic-transcript document. The server-generated result PDF
 * (task 4.4) is blocked on backend 8.4, so — mirroring the admission document
 * pattern (`admissions/public/application-document.ts`) — the mark sheet builds
 * a self-contained styled HTML document, rasterizes it offscreen, and embeds it
 * into a single-page A4 jsPDF. `downloadMarkSheetPdf` saves it directly;
 * `printMarkSheetPdf` opens it with the browser print dialog.
 *
 * The layout mirrors the on-screen `ResultMarkSheet` (BTEB academic transcript):
 * guilloché border, parchment paper, school seal, serif header, grading legend,
 * bordered subjects table, boxed GPA, signature lines, centered logo watermark,
 * and a footnote. It reuses the app's next/font CSS variables (already on
 * :root) so the offscreen capture renders in the same faces. Replace with the
 * server PDF once the contract lands.
 */

import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"

import type { GradingBand } from "@/types/mark"

/** Fixed authoring width (px) — proportional to A4 for deterministic capture. */
const DOC_WIDTH = 850
const DASH = "—"

const FONT_SERIF = "var(--font-serif), 'EB Garamond', Georgia, serif"
const FONT_DISPLAY =
  "var(--font-serif-display), 'Playfair Display', Georgia, serif"
const FONT_SCRIPT = "var(--font-script), 'Caveat', cursive"
const FONT_MONO = "var(--font-mono), ui-monospace, monospace"
const FONT_SANS = "var(--font-sans), sans-serif"
const HEADER_LOGO_SIZE = 82
const GRADING_LEGEND_WIDTH = 260
const WATERMARK_LOGO_TOP = "44%"
const WATERMARK_TEXT_TOP = "56%"
const WATERMARK_LOGO_SIZE = 340
const WATERMARK_HALO_SIZE = 430
const WATERMARK_LOGO_OPACITY = 0.11

const DEFAULT_THEME = { pattern: "#9b7d94", line: "#6e5270" }
const BORDER_THEMES: Record<string, { pattern: string; line: string }> = {
  sage: { pattern: "#96a488", line: "#5f6e52" },
  slate: { pattern: "#8090a8", line: "#4f5f7a" },
  sand: { pattern: "#a89478", line: "#7a6a4f" },
  plum: DEFAULT_THEME,
}

const COLOR = {
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

export interface MarkSheetDocSubject {
  code?: string | null
  name: string | null
  marks?: string | number | null
  credit?: string | number | null
  grade?: string | null
  point?: string | number | null
}

export interface MarkSheetDocData {
  schoolName: string
  /** Second header line (address); rendered under the school name when present. */
  schoolAddress?: string | null
  /** Logo URL; inlined to a data URL before capture, dropped if it can't load. */
  schoolLogo?: string | null
  title: string
  subtitle?: string | null
  examMonth?: string | null
  slNo?: string | null
  fields: Array<{ label: string; value: string }>
  scale?: GradingBand[]
  subjects: MarkSheetDocSubject[]
  gpa: string
  gpaLabel: string
  grade?: string | null
  publishDate?: string | null
  issueDate?: string | null
  /** Diagonal watermark text; omitted for an original. */
  watermark?: string | null
  /** Guilloché border preset key. Defaults to "sage". */
  borderTheme?: string | null
  signature1?: string | null
  signature2?: string | null
  /** Downloaded file name (without extension). */
  fileName: string
}

function esc(value: string | number | null | undefined): string {
  if (value == null) return ""
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function text(value: string | number | null | undefined): string {
  if (value == null || value === "") return DASH
  return esc(value)
}

function formatPoint(value: string | number | null | undefined): string {
  if (value == null || value === "") return DASH
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return esc(value)
  return numeric.toFixed(2)
}

/** Read a remote image into a data URL so it embeds in the offscreen document. */
async function toDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: "cors" })
    if (!response.ok) return null
    const blob = await response.blob()
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function fieldsHtml(fields: MarkSheetDocData["fields"]): string {
  return fields
    .map(
      (field) => `
      <div style="display:flex;">
        <span style="width:150px;flex:none;">${esc(field.label)}</span>
        <span>:&nbsp;&nbsp;<b>${text(field.value)}</b></span>
      </div>`
    )
    .join("")
}

function legendHtml(scale: GradingBand[]): string {
  const ordered = [...scale].sort((a, b) => b.min_marks - a.min_marks)
  const head = `border:1px solid ${COLOR.legendBorder};padding:4px 8px;background:${COLOR.headerBar};font-weight:700;text-align:center;`
  const cell = `border:1px solid ${COLOR.legendBorder};padding:3px 8px;text-align:center;`
  const body = ordered
    .map(
      (band) => `
      <tr>
        <td style="${cell}">${band.min_marks} – ${band.max_marks}</td>
        <td style="${cell}">${esc(band.grade)}</td>
        <td style="${cell}">${formatPoint(band.grade_point)}</td>
      </tr>`
    )
    .join("")
  return `<table style="border-collapse:collapse;font-size:12px;width:100%;height:100%;">
    <thead><tr>
      <th style="${head}">Range of Marks<br>(Percentage)</th>
      <th style="${head}">Grade</th>
      <th style="${head}">Point</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>`
}

function subjectsHtml(data: MarkSheetDocData): string {
  const showMarks = data.subjects.some((s) => s.marks != null && s.marks !== "")
  const showCredit = data.subjects.some(
    (s) => s.credit != null && s.credit !== ""
  )
  const showPoint = data.subjects.some((s) => s.point != null && s.point !== "")
  const columnCount =
    2 + (showMarks ? 1 : 0) + (showCredit ? 1 : 0) + (showPoint ? 1 : 0)

  const head = (label: string, width?: number) =>
    `<th style="border:1.5px solid ${COLOR.subjectBorderStrong};padding:8px 12px;background:${COLOR.headerBar};font-weight:700;text-align:center;${width ? `width:${width}px;` : ""}">${label}</th>`
  const cell = `border:1px solid ${COLOR.subjectBorder};padding:8px 12px;`
  const center = `${cell}text-align:center;`

  const header = `<tr>
      ${head("Subjects")}
      ${showMarks ? head("Marks", 80) : ""}
      ${showCredit ? head("Credit<br>Hours", 80) : ""}
      ${head("Grade<br>Letter", 90)}
      ${showPoint ? head("Grade<br>Point", 90) : ""}
    </tr>`

  const body = data.subjects
    .map((subject) => {
      const label = subject.code
        ? `${esc(subject.code)} - ${esc(subject.name)}`
        : text(subject.name)
      return `<tr>
        <td style="${cell}">${label}</td>
        ${showMarks ? `<td style="${center}">${text(subject.marks)}</td>` : ""}
        ${showCredit ? `<td style="${center}">${text(subject.credit)}</td>` : ""}
        <td style="${center}font-weight:600;">${text(subject.grade)}</td>
        ${showPoint ? `<td style="${center}">${formatPoint(subject.point)}</td>` : ""}
      </tr>`
    })
    .join("")

  const empty = `<tr><td colspan="${columnCount}" style="${center}padding:24px 12px;color:#555;">No subject marks were returned for this result.</td></tr>`

  return `<table style="width:100%;border-collapse:collapse;margin-top:22px;font-size:14.5px;">
    <thead>${header}</thead>
    <tbody>${data.subjects.length === 0 ? empty : body}</tbody>
  </table>`
}

function signatureHtml(
  signature: string | null | undefined,
  caption: string,
  minWidth: number,
  size: number,
  rotate: number
): string {
  const script = signature
    ? `<div style="font-family:${FONT_SCRIPT};font-size:${size}px;color:${COLOR.signatureInk};transform:rotate(${rotate}deg);">${esc(signature)}</div>`
    : `<div style="height:${size + 4}px;"></div>`
  return `<div style="text-align:center;">
      ${script}
      <div style="border-top:1px solid #333;padding-top:3px;margin-top:2px;min-width:${minWidth}px;">${caption}</div>
    </div>`
}

/** Build the complete transcript markup (a `.marksheet` root). */
function buildMarkSheetHtml(data: MarkSheetDocData): string {
  const theme = BORDER_THEMES[data.borderTheme ?? "plum"] ?? DEFAULT_THEME
  const institution = esc(data.schoolName || "Academic Institution")
  const addressLine = data.schoolAddress
    ? `<br>${esc(data.schoolAddress)}`
    : ""

  const seal = data.schoolLogo
    ? `<img src="${esc(data.schoolLogo)}" alt="" style="width:${HEADER_LOGO_SIZE}px;height:${HEADER_LOGO_SIZE}px;flex:none;object-fit:contain;margin-top:4px;" />`
    : ""

  const watermarkLogo = data.schoolLogo
    ? `<div style="position:absolute;top:${WATERMARK_LOGO_TOP};left:50%;transform:translate(-50%,-50%);width:${WATERMARK_HALO_SIZE}px;height:${WATERMARK_HALO_SIZE}px;display:grid;place-items:center;pointer-events:none;z-index:0;"><div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle, rgba(255,255,255,0) 34%, rgba(31,75,137,.04) 72%, rgba(53,182,87,.06) 100%);"></div><img src="${esc(data.schoolLogo)}" alt="" style="width:${WATERMARK_LOGO_SIZE}px;height:${WATERMARK_LOGO_SIZE}px;object-fit:contain;opacity:${WATERMARK_LOGO_OPACITY};" /></div>`
    : ""

  const watermark = data.watermark
    ? `<div style="position:absolute;top:${WATERMARK_TEXT_TOP};left:50%;transform:translate(-50%,-50%) rotate(-24deg);font-size:64px;font-weight:800;color:rgba(180,30,30,.13);letter-spacing:.08em;font-family:${FONT_SANS};pointer-events:none;white-space:nowrap;z-index:1;">${esc(data.watermark)}</div>`
    : ""

  const slNo =
    data.slNo && data.slNo !== ""
      ? `<div style="margin-top:16px;font-weight:700;font-size:14.5px;color:${COLOR.slPurple};">SL No- <span style="letter-spacing:.03em;">${esc(data.slNo)}</span></div>`
      : ""

  const subLine = data.examMonth
    ? `<div style="font-style:italic;font-size:13.5px;color:${COLOR.footerInk};margin-top:3px;">(Held in the Month of ${esc(data.examMonth)})</div>`
    : data.subtitle
      ? `<div style="font-style:italic;font-size:13.5px;color:${COLOR.footerInk};margin-top:3px;">${esc(data.subtitle)}</div>`
      : ""

  const legend =
    data.scale && data.scale.length > 0 ? legendHtml(data.scale) : ""

  const gpaValue = `${text(data.gpa)}${data.grade ? `  ${esc(data.grade)}` : ""}`

  return `
<div class="marksheet" style="width:${DOC_WIDTH}px;box-sizing:border-box;color:${COLOR.ink};font-family:${FONT_SERIF};">
  <div style="background-color:${theme.pattern};background-image:repeating-linear-gradient(45deg, rgba(255,255,255,.32) 0 2px, transparent 2px 9px),repeating-linear-gradient(-45deg, rgba(255,255,255,.32) 0 2px, transparent 2px 9px);padding:22px;">
    <div style="position:relative;background:${COLOR.paper};padding:2px;">
      <div style="position:absolute;top:6px;left:6px;right:6px;bottom:6px;border:1px solid ${theme.line};pointer-events:none;"></div>
      <div style="position:relative;padding:34px 46px 30px;font-size:14.5px;line-height:1.4;">

        ${watermarkLogo}
        ${watermark}

        <div style="position:relative;z-index:2;">
          <div style="display:flex;align-items:flex-start;gap:16px;">
            ${seal}
            <div style="flex:1;text-align:center;padding-right:${seal ? HEADER_LOGO_SIZE : 0}px;">
              <div style="font-family:${FONT_DISPLAY};font-weight:700;font-size:26px;line-height:1.15;letter-spacing:.01em;">${institution}${addressLine}</div>
              <div style="font-weight:700;font-size:14px;letter-spacing:.14em;color:${COLOR.transcriptRed};margin-top:6px;">ACADEMIC TRANSCRIPT</div>
            </div>
          </div>

          ${slNo}

          <div style="text-align:center;margin-top:24px;">
            <div style="font-weight:700;font-size:15px;letter-spacing:.04em;text-transform:uppercase;">${esc(data.title)}</div>
            ${subLine}
          </div>

          <div style="display:flex;gap:22px;margin-top:22px;align-items:stretch;flex-wrap:wrap;">
            <div style="flex:1;font-size:14.5px;display:flex;flex-direction:column;gap:9px;">
              ${fieldsHtml(data.fields)}
            </div>
            ${
              legend
                ? `<div style="flex:0 0 ${GRADING_LEGEND_WIDTH}px;width:${GRADING_LEGEND_WIDTH}px;display:flex;">${legend}</div>`
                : ""
            }
          </div>

          ${subjectsHtml(data)}

          <div style="display:flex;justify-content:flex-end;margin-top:16px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-weight:700;font-size:15px;">${esc(data.gpaLabel)} :</span>
              <span style="border:1.5px solid #333;padding:6px 20px;font-weight:700;font-size:15px;background:#fff;font-family:${FONT_MONO};">${gpaValue}</span>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:46px;font-size:13px;gap:14px;">
            <div>
              <div>Date of Publication of Result : ${text(data.publishDate)}</div>
              <div style="margin-top:3px;">Date of Issue : ${text(data.issueDate)}</div>
            </div>
            ${signatureHtml(data.signature1, "Compared by", 110, 26, -2)}
            ${signatureHtml(`${data.signature2 ?? ""}`, `Controller of Examinations<br>${institution}`, 200, 28, -3)}
          </div>
        </div>
      </div>
    </div>
  </div>
  <div style="width:${DOC_WIDTH}px;text-align:center;margin-top:10px;">
    <span style="color:${COLOR.noteRed};font-size:12.5px;font-family:${FONT_SERIF};font-style:italic;">This Academic Transcript is issued without any alteration or erasure</span>
  </div>
</div>`
}

/** Render the transcript offscreen and embed it into a single-page A4 jsPDF. */
async function renderMarkSheetPdf(data: MarkSheetDocData): Promise<jsPDF> {
  const inlineLogo = data.schoolLogo ? await toDataUrl(data.schoolLogo) : null

  const host = document.createElement("div")
  host.style.position = "fixed"
  host.style.left = "-10000px"
  host.style.top = "0"
  host.style.width = `${DOC_WIDTH}px`
  host.style.background = "#ffffff"
  host.innerHTML = buildMarkSheetHtml({
    ...data,
    schoolLogo: inlineLogo ?? data.schoolLogo,
  })
  document.body.appendChild(host)

  try {
    const target = host.querySelector<HTMLElement>(".marksheet") ?? host
    const canvas = await html2canvas(target, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    })

    const doc = new jsPDF({ unit: "pt", format: "a4" })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const imgData = canvas.toDataURL("image/jpeg", 0.95)

    // Fit the whole transcript onto one page: full width, shrunk to fit height.
    const ratio = canvas.width / canvas.height
    let imgW = pageW
    let imgH = imgW / ratio
    if (imgH > pageH) {
      imgH = pageH
      imgW = imgH * ratio
    }
    const x = (pageW - imgW) / 2

    doc.addImage(imgData, "JPEG", x, 8, imgW, imgH)
    return doc
  } finally {
    document.body.removeChild(host)
  }
}

/** Generate the transcript PDF and download it directly (no print dialog). */
export async function downloadMarkSheetPdf(
  data: MarkSheetDocData
): Promise<boolean> {
  try {
    const doc = await renderMarkSheetPdf(data)
    doc.save(`${data.fileName}.pdf`)
    return true
  } catch {
    return false
  }
}

/** Generate the transcript PDF and open it with the browser print dialog. */
export async function printMarkSheetPdf(
  data: MarkSheetDocData
): Promise<boolean> {
  try {
    const doc = await renderMarkSheetPdf(data)
    doc.autoPrint()
    const blobUrl = doc.output("bloburl")
    const opened = window.open(String(blobUrl), "_blank")
    if (!opened) {
      // Popup blocked — fall back to a direct download so the action isn't lost.
      doc.save(`${data.fileName}.pdf`)
    }
    return true
  } catch {
    return false
  }
}
