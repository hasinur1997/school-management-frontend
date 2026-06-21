/**
 * Markup for the downloadable admission application PDF (task 2.5). The
 * confirmation screen rasterizes this HTML with html2canvas and embeds it into a
 * jsPDF, so the visitor downloads a styled document of what they submitted.
 *
 * The layout mirrors the on-screen Preview design (`step-preview.tsx`): a navy
 * header banner, a branch-summary card beside the applicant photo, then
 * accent-headed sectioned cards of key/value rows. It's authored at a fixed
 * width (`DOC_WIDTH`) for deterministic rasterization, and uses flexbox (not CSS
 * grid, which html2canvas lays out unreliably) throughout.
 */

import type { AdmissionFormValues } from "./schema"

/** Fixed authoring width (px). Matches an A4 page proportionally. */
export const DOC_WIDTH = 800

export interface ApplicationDocData {
  /** Assigned on submission; `null` in the pre-submit Preview. */
  applicationNo: string | null
  schoolName: string
  branchName: string
  className: string
  session: string
  values: AdmissionFormValues
  /** Object URL or data URL for the student photo, when available. */
  photoUrl: string | null
}

const DASH = "—"

function esc(value: string | null | undefined): string {
  if (value == null) return ""
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

type Row = [label: string, value: string | null | undefined]

/** One key/value row. `wide` spans the full card width (head card rows). */
function row(label: string, value: string | null | undefined, wide = false): string {
  return `<div class="row${wide ? " wide" : ""}"><span class="k">${esc(label)}</span><span class="v">${esc(value) || DASH}</span></div>`
}

/** An accent-headed section card with a 2-column body of key/value rows. */
function section(title: string, rows: Row[]): string {
  const body = rows.map(([k, v]) => row(k, v)).join("")
  return `<div class="card"><div class="card-head">${esc(title)}</div><div class="card-body">${body}</div></div>`
}

/** The scoped stylesheet for the document. */
function styles(): string {
  return `
<style>
  .appdoc, .appdoc * { box-sizing: border-box; margin: 0; padding: 0; }
  .appdoc {
    width: ${DOC_WIDTH}px;
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Noto Sans Bengali", sans-serif;
    color: #16213b;
    background: #ffffff;
    line-height: 1.4;
    padding: 32px;
  }

  .appdoc .stack > * + * { margin-top: 22px; }

  /* Navy header banner */
  .appdoc .banner {
    display: flex; justify-content: space-between; align-items: center;
    background: #13294b; border-radius: 16px; padding: 24px 28px;
  }
  .appdoc .brand { display: flex; align-items: center; gap: 18px; }
  .appdoc .logo {
    width: 54px; height: 54px; border-radius: 12px;
    background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25);
    /* html2canvas centres single-line text via line-height more reliably than
       flexbox; the box is border-box so line-height is height minus the borders. */
    text-align: center; line-height: 52px;
    font-size: 24px; font-weight: 800; color: #ffffff;
  }
  .appdoc .kicker { font-size: 11px; font-weight: 600; letter-spacing: 0.2em; color: #9fb6d6; text-transform: uppercase; }
  .appdoc .banner h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.01em; color: #ffffff; margin-top: 3px; }
  .appdoc .head-right { text-align: right; }
  .appdoc .appno-label { font-size: 10.5px; font-weight: 600; letter-spacing: 0.14em; color: #9fb6d6; text-transform: uppercase; }
  .appdoc .appno { font-size: 20px; font-weight: 700; margin-top: 2px; color: #ffffff; }
  .appdoc .class-badge {
    display: inline-block; margin-top: 9px; background: #2f6fed; color: #ffffff;
    font-size: 12.5px; font-weight: 700; border-radius: 7px;
    /* Centre vertically via a fixed height + matching line-height (html2canvas
       does not honour vertical padding centring on inline-block text). */
    height: 26px; line-height: 26px; padding: 0 13px;
  }

  /* Head row: branch summary + applicant photo */
  .appdoc .top { display: flex; gap: 22px; align-items: stretch; }
  .appdoc .info-card {
    flex: 1; border: 1px solid #e6ebf2; border-radius: 13px; overflow: hidden;
  }
  .appdoc .info-card .bar { height: 4px; background: #2f6fed; }
  .appdoc .photo {
    flex: 0 0 152px; width: 152px; border: 1.5px solid #e6ebf2; border-radius: 14px;
    background: #ffffff; padding: 9px;
  }
  .appdoc .photo img { width: 100%; height: 168px; object-fit: cover; border-radius: 9px; display: block; }
  .appdoc .photo .empty {
    width: 100%; height: 168px; border-radius: 9px; background: #f4f8fd;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; color: #98a8c4;
  }

  /* Section cards */
  .appdoc .card { border: 1px solid #e6ebf2; border-radius: 13px; overflow: hidden; }
  .appdoc .card-head {
    background: #f7fafc; border-bottom: 1px solid #e6ebf2; padding: 11px 18px;
    font-size: 12px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: #2f6fed;
  }
  .appdoc .card-body { display: flex; flex-wrap: wrap; }

  /* Key/value rows (2-up; .wide spans full width) */
  .appdoc .row {
    flex: 0 0 50%; width: 50%;
    display: flex; justify-content: space-between; gap: 14px; align-items: baseline;
    padding: 11px 18px; border-bottom: 1px solid #f0f3f8;
  }
  .appdoc .info-card .row { padding: 13px 18px; }
  .appdoc .row.wide { flex: 0 0 100%; width: 100%; }
  .appdoc .row .k { color: #7a8aa0; font-size: 14px; white-space: nowrap; }
  .appdoc .row .v { color: #16213b; font-size: 14px; font-weight: 600; text-align: right; word-break: break-word; }
</style>`
}

/** Build the complete document markup (a `<style>` block + the `.appdoc` root). */
export function buildApplicationHtml(data: ApplicationDocData): string {
  const v = data.values
  const logo = (data.schoolName || data.branchName || "?").trim().charAt(0).toUpperCase()

  const photo = data.photoUrl
    ? `<div class="photo"><img src="${esc(data.photoUrl)}" alt="Applicant photo" /></div>`
    : `<div class="photo"><div class="empty">No photo</div></div>`

  const filledEducations = v.previous_educations.filter(
    (r) => r.exam_name.trim() || r.institution_name.trim()
  )
  const educationRows: Row[] = filledEducations.flatMap((r, i) => {
    const n = filledEducations.length > 1 ? ` #${i + 1}` : ""
    return [
      [`Exam${n}`, r.exam_name],
      [`Institution${n}`, r.institution_name],
      [`GPA${n}`, r.gpa],
      [`Passing year${n}`, r.passing_year],
    ] as Row[]
  })

  const documentRows: Row[] = (v.documents ?? []).map((f, i) => [`File #${i + 1}`, f.name])

  return `${styles()}
<div class="appdoc">
  <div class="stack">
    <div class="banner">
      <div class="brand">
        <div class="logo">${esc(logo)}</div>
        <div>
          <div class="kicker">${esc(data.schoolName || data.branchName)}</div>
          <h1>Admission Application</h1>
        </div>
      </div>
      <div class="head-right">
        <div class="appno-label">Application No.</div>
        <div class="appno">${esc(data.applicationNo) || "Pending"}</div>
        <div class="class-badge">${esc(data.className)}</div>
      </div>
    </div>

    <div class="top">
      <div class="info-card">
        <div class="bar"></div>
        ${row("Branch", data.branchName, true)}
        ${row("Class", data.className, true)}
        ${row("Session", data.session, true)}
      </div>
      ${photo}
    </div>

    ${section("Student", [
      ["Name (Bangla)", v.name_bn],
      ["Name (English)", v.name_en],
      ["Date of birth", v.date_of_birth],
      ["Birth reg. no.", v.birth_reg_no],
      ["Religion", v.religion],
      ["Nationality", v.nationality],
      ["Caste", v.caste],
    ])}

    ${section("Guardian", [
      ["Father (English)", v.father_name_en],
      ["Father mobile", v.father_mobile],
      ["Father NID", v.father_nid],
      ["Mother (English)", v.mother_name_en],
      ["Mother mobile", v.mother_mobile],
      ["Mother NID", v.mother_nid],
    ])}

    ${section("Present address", [
      ["Village / street", v.present_village],
      ["Post office", v.present_post_office],
      ["Upazila", v.present_upazila],
      ["District", v.present_district],
    ])}

    ${section("Permanent address", [
      ["Village / street", v.permanent_village],
      ["Post office", v.permanent_post_office],
      ["Upazila", v.permanent_upazila],
      ["District", v.permanent_district],
    ])}

    ${educationRows.length ? section("Education", educationRows) : ""}

    ${documentRows.length ? section("Documents", documentRows) : ""}
  </div>
</div>`
}
