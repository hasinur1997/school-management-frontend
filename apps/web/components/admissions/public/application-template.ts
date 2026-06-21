/**
 * Single source of truth for the admission application document design (task
 * 2.5). Both the on-screen Preview step and the downloadable PDF render the
 * *exact same* markup produced here, so the two can never drift: the PDF
 * rasterizes this HTML with html2canvas, and the Preview injects it directly and
 * scales it to fit. Styled as a formal printed admission form (navy header,
 * affix-photo box, bordered field grids, signature lines).
 *
 * The document is authored at a fixed page width (`DOC_WIDTH`) so the layout is
 * deterministic across both surfaces; the Preview applies a CSS transform to fit
 * its container.
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

/** A label/value cell pair inside a `.kv` grid. */
function kv(label: string, value: string | null | undefined): string {
  return `<div class="kv-row"><span class="kv-k">${esc(label)}</span><span class="kv-v">${esc(value) || DASH}</span></div>`
}

/** A titled card (used for the Father/Mother and address columns). */
function card(title: string, rows: string): string {
  return `<div class="card"><div class="card-head">${esc(title)}</div><div class="kv">${rows}</div></div>`
}

/** A section heading with a trailing rule. */
function sectionHead(title: string): string {
  return `<div class="sec-head"><span>${esc(title)}</span><span class="rule"></span></div>`
}

/** The scoped stylesheet for the document. */
function styles(): string {
  return `
<style>
  .appdoc, .appdoc * { box-sizing: border-box; margin: 0; padding: 0; }
  .appdoc {
    width: ${DOC_WIDTH}px;
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Noto Sans Bengali", sans-serif;
    color: #14284e;
    background: #ffffff;
    line-height: 1.45;
  }

  /* Header */
  .appdoc .doc-head {
    display: flex; justify-content: space-between; align-items: center;
    background: #13294f; color: #ffffff; padding: 28px 40px;
  }
  .appdoc .brand { display: flex; align-items: center; gap: 18px; }
  .appdoc .logo {
    width: 64px; height: 64px; border-radius: 12px;
    background: #1f3a66; border: 1px solid rgba(255,255,255,0.18);
    display: flex; align-items: center; justify-content: center;
    font-size: 32px; font-weight: 800; color: #ffffff;
  }
  .appdoc .kicker { font-size: 12px; font-weight: 700; letter-spacing: 0.18em; color: #9fb3d6; margin-bottom: 5px; }
  .appdoc .doc-head h1 { font-size: 30px; font-weight: 800; letter-spacing: -0.01em; }
  .appdoc .head-right { text-align: right; }
  .appdoc .appno-label { font-size: 11px; font-weight: 700; letter-spacing: 0.16em; color: #9fb3d6; }
  .appdoc .appno { font-size: 24px; font-weight: 800; margin-top: 2px; color: #ffffff; }
  .appdoc .class-badge {
    display: inline-block; margin-top: 12px; background: #2f6df0; color: #ffffff;
    font-size: 13px; font-weight: 700; padding: 5px 14px; border-radius: 6px;
  }

  /* Body */
  .appdoc .body { padding: 28px 40px 36px; }

  /* Top: info card + affix photo */
  .appdoc .top { display: flex; gap: 24px; align-items: flex-start; }
  .appdoc .info-card {
    flex: 1; border: 1px solid #e3e8f0; border-top: 3px solid #2f6df0;
    border-radius: 10px; overflow: hidden;
  }
  .appdoc .affix {
    flex: 0 0 150px; width: 150px; height: 168px;
    border: 2px dashed #c6d3e8; border-radius: 10px; background: #f4f8fd;
    display: flex; align-items: center; justify-content: center; text-align: center;
    font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #98a8c4; padding: 14px;
  }
  .appdoc .affix img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; }

  /* Sections */
  .appdoc .sec-head {
    display: flex; align-items: center; gap: 14px; margin: 26px 0 12px;
    font-size: 13px; font-weight: 800; letter-spacing: 0.12em; color: #13294f; text-transform: uppercase;
  }
  .appdoc .sec-head .rule { flex: 1; height: 0; border-top: 1.5px solid #13294f; }

  /* Key/value grids */
  .appdoc .kv-table { border: 1px solid #e3e8f0; border-radius: 10px; overflow: hidden; }
  .appdoc .kv-row { display: flex; border-top: 1px solid #e9edf4; }
  .appdoc .kv-table > .kv-row:first-child, .appdoc .kv > .kv-row:first-child { border-top: 0; }
  .appdoc .kv-k {
    flex: 0 0 34%; width: 34%; background: #f4f7fc; padding: 12px 16px;
    font-size: 13px; color: #5b6678;
  }
  .appdoc .kv-v { flex: 1; padding: 12px 16px; font-size: 14px; font-weight: 700; color: #14284e; word-break: break-word; }

  /* Two-column card rows */
  .appdoc .cols { display: flex; gap: 20px; }
  .appdoc .col { flex: 1; }
  .appdoc .card { border: 1px solid #e3e8f0; border-radius: 10px; overflow: hidden; }
  .appdoc .card-head {
    background: #eef3fb; color: #2f6df0; font-size: 12px; font-weight: 800;
    letter-spacing: 0.08em; padding: 11px 16px; text-transform: uppercase;
  }
  .appdoc .card .kv-k { flex: 0 0 42%; width: 42%; }

  /* Previous education table */
  .appdoc .edu { border: 1px solid #e3e8f0; border-radius: 10px; overflow: hidden; }
  .appdoc .edu-row { display: flex; border-top: 1px solid #e9edf4; }
  .appdoc .edu-head { background: #f4f7fc; border-top: 0; }
  .appdoc .edu-row > span { padding: 13px 16px; font-size: 14px; font-weight: 700; color: #14284e; }
  .appdoc .edu-head > span { font-size: 11px; font-weight: 800; letter-spacing: 0.08em; color: #828a99; text-transform: uppercase; }
  .appdoc .edu-c-inst { flex: 2; }
  .appdoc .edu-c-exam { flex: 2; }
  .appdoc .edu-c-gpa { flex: 1; }
  .appdoc .edu-c-year { flex: 1; }

  /* Declaration + signatures */
  .appdoc .declare {
    margin-top: 30px; padding-top: 20px; border-top: 1px solid #e3e8f0;
    font-size: 13px; line-height: 1.7; color: #6b7585;
  }
  .appdoc .signs { display: flex; gap: 28px; margin-top: 52px; }
  .appdoc .sign { flex: 1; text-align: center; }
  .appdoc .sign .line { border-top: 1.5px solid #9aa6ba; margin-bottom: 9px; }
  .appdoc .sign .lbl { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: #6b7585; text-transform: uppercase; }
</style>`
}

/** Build the complete document markup (a `<style>` block + the `.appdoc` root). */
export function buildApplicationHtml(data: ApplicationDocData): string {
  const v = data.values
  const logo = (data.schoolName || data.branchName || "?").trim().charAt(0).toUpperCase()

  const educationRows = v.previous_educations
    .filter((r) => r.exam_name.trim() && r.institution_name.trim())
    .map(
      (r) =>
        `<div class="edu-row"><span class="edu-c-inst">${esc(r.institution_name)}</span><span class="edu-c-exam">${esc(r.exam_name)}</span><span class="edu-c-gpa">${esc(r.gpa) || DASH}</span><span class="edu-c-year">${esc(r.passing_year) || DASH}</span></div>`
    )
    .join("")

  const educationSection = educationRows
    ? `${sectionHead("Previous Education")}
      <div class="edu">
        <div class="edu-row edu-head">
          <span class="edu-c-inst">Institution</span>
          <span class="edu-c-exam">Examination</span>
          <span class="edu-c-gpa">GPA</span>
          <span class="edu-c-year">Year</span>
        </div>
        ${educationRows}
      </div>`
    : ""

  const affix = data.photoUrl
    ? `<div class="affix"><img src="${esc(data.photoUrl)}" alt="Student photo" /></div>`
    : `<div class="affix">AFFIX<br/>PASSPORT<br/>PHOTO</div>`

  return `${styles()}
<div class="appdoc">
  <div class="doc-head">
    <div class="brand">
      <div class="logo">${esc(logo)}</div>
      <div>
        <div class="kicker">${esc((data.schoolName || data.branchName).toUpperCase())}</div>
        <h1>Admission Application</h1>
      </div>
    </div>
    <div class="head-right">
      <div class="appno-label">APPLICATION NO.</div>
      <div class="appno">${esc(data.applicationNo) || "Pending"}</div>
      <div class="class-badge">${esc(data.className)}</div>
    </div>
  </div>

  <div class="body">
    <div class="top">
      <div class="info-card">
        <div class="kv">
          ${kv("Branch", data.branchName)}
          ${kv("Class applying for", data.className)}
          ${kv("Session", data.session)}
        </div>
      </div>
      ${affix}
    </div>

    ${sectionHead("Student Details")}
    <div class="kv-table">
      ${kv("Name (Bangla)", v.name_bn)}
      ${kv("Name (English)", v.name_en)}
      ${kv("Date of birth", v.date_of_birth)}
      ${kv("Birth registration no.", v.birth_reg_no)}
      ${kv("Religion", v.religion)}
      ${kv("Nationality", v.nationality)}
      ${kv("Caste", v.caste)}
    </div>

    ${sectionHead("Guardian Information")}
    <div class="cols">
      <div class="col">
        ${card(
          "Father",
          kv("Name (Bangla)", v.father_name_bn) +
            kv("Name (English)", v.father_name_en) +
            kv("National ID", v.father_nid) +
            kv("Mobile", v.father_mobile)
        )}
      </div>
      <div class="col">
        ${card(
          "Mother",
          kv("Name (Bangla)", v.mother_name_bn) +
            kv("Name (English)", v.mother_name_en) +
            kv("National ID", v.mother_nid) +
            kv("Mobile", v.mother_mobile)
        )}
      </div>
    </div>

    ${sectionHead("Address")}
    <div class="cols">
      <div class="col">
        ${card(
          "Present Address",
          kv("Village", v.present_village) +
            kv("Post office", v.present_post_office) +
            kv("Upazila", v.present_upazila) +
            kv("District", v.present_district)
        )}
      </div>
      <div class="col">
        ${card(
          "Permanent Address",
          kv("Village", v.permanent_village) +
            kv("Post office", v.permanent_post_office) +
            kv("Upazila", v.permanent_upazila) +
            kv("District", v.permanent_district)
        )}
      </div>
    </div>

    ${educationSection}

    <p class="declare">I hereby declare that the information provided in this application is true and correct to the best of my knowledge. I understand that any false statement may result in the cancellation of admission.</p>

    <div class="signs">
      <div class="sign"><div class="line"></div><div class="lbl">Applicant's Signature</div></div>
      <div class="sign"><div class="line"></div><div class="lbl">Guardian's Signature</div></div>
      <div class="sign"><div class="line"></div><div class="lbl">Authority &amp; Seal</div></div>
    </div>
  </div>
</div>`
}
