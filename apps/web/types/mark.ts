/**
 * Mark-entry contract types (task 4.2). The backend contract
 * `docs/api/exams-marks.md` is absent from this repo (see the progress
 * tracker's note); these shapes follow the live API (`MarkController` +
 * `MarkSheetResource` / `GradingScaleResource`):
 *
 *   - `GET  /exams/{id}/marks/sheet?subject_id=&section_id=` → the roster with
 *     each student's already-entered mark (or null).
 *   - `POST /exams/{id}/marks` → bulk upsert of `{ subject_id, marks[] }`.
 *   - `GET  /grading-scales` → the global, server-owned grade bands.
 *
 * Ids (`subject_id`, `section_id`, `enrollment_id`) are opaque `public_id`
 * hashes; the backend's `ResolvePublicIds` middleware translates them to
 * internal keys before validation, so the client only ever deals in hashes.
 */

/**
 * One band of the global grading scale (`GET /grading-scales`). The scale is
 * server-owned: the client only ever *displays* the band a mark falls into,
 * never invents thresholds or a GPA (`feature-specs/12`, Rules).
 */
export interface GradingBand {
  grade: string
  min_marks: number
  max_marks: number
  /** Decimal cast — the API may serialise this as a string. */
  grade_point: string | number
  is_fail: boolean
}

/** The grade a mark resolves to under the server's scale (display only). */
export interface ResolvedGrade {
  grade: string
  grade_point: string | number
  is_fail: boolean
}

/** A roster row on the marks sheet — one active student in roll order. */
export interface MarkSheetStudent {
  enrollment_id: string
  roll_no: string | number | null
  name_en: string | null
  /** Student identifier (admission no) shown under the name. */
  sid: string | null
  /** The mark already entered for this exam+subject, or null when none yet. */
  obtained_marks: number | null
  /** Whether the student was marked absent for this exam+subject. */
  is_absent: boolean
}

/** The subject's marking bounds, carried on the sheet for per-row validation. */
export interface MarkSheetSubject {
  full_marks: number
  pass_marks: number
}

/** `GET /exams/{id}/marks/sheet` payload. */
export interface MarkSheet {
  exam: { id: string; name: string; status: string }
  subject: MarkSheetSubject
  students: MarkSheetStudent[]
}

/** One subject column on the multi-subject matrix. */
export interface MatrixSubject {
  id: string
  code: string | null
  name: string
  full_marks: number
  pass_marks: number
}

/** One mark cell on the matrix — a student's mark for one subject column. */
export interface MatrixCell {
  subject_id: string
  obtained_marks: number | null
  is_absent: boolean
}

/** A roster row on the matrix — one student carrying a cell per subject. */
export interface MatrixStudent {
  enrollment_id: string
  roll_no: string | number | null
  name_en: string | null
  /** Student identifier (admission no) shown under the name. */
  sid: string | null
  marks: MatrixCell[]
}

/** `GET /exams/{id}/marks/matrix?section_id=` payload. */
export interface MarkMatrix {
  exam: { id: string; name: string; status: string }
  subjects: MatrixSubject[]
  students: MatrixStudent[]
}

/** Selection that scopes the matrix read; class is required, section optional. */
export interface MarkMatrixParams {
  exam_id?: string | null
  class_id?: string | null
  /** Optional filter — omit to load the whole class (all sections). */
  section_id?: string | null
}

/** Selection that scopes the sheet read; all three are required to load. */
export interface MarkSheetParams {
  /** The exam's `public_id`; part of the path, not the query. */
  exam_id?: string | null
  subject_id?: string | null
  section_id?: string | null
}

/** One row of the bulk save payload. An absent row carries no marks. */
export interface MarkEntryRow {
  enrollment_id: string
  obtained_marks?: number
  is_absent?: boolean
}

/** `POST /exams/{id}/marks` body. */
export interface SaveMarksInput {
  subject_id: string
  marks: MarkEntryRow[]
}

/** `POST /exams/{id}/marks` result. */
export interface SaveMarksResult {
  saved: number
}

/**
 * Resolve obtained marks to their grade band using the *server-owned* grading
 * scale. This mirrors the backend `GradeResolver` exactly — bands ordered by
 * `min_marks` descending, the first band the marks reach (`marks >= min_marks`)
 * is the match — so the previewed grade equals the one the server snapshots on
 * save. The client never computes its own thresholds or GPA; it only displays
 * the band the API's scale assigns (`feature-specs/12`, Rules).
 */
export function resolveGrade(
  marks: number | null | undefined,
  scale: GradingBand[] | undefined
): ResolvedGrade | null {
  if (marks == null || !Number.isFinite(marks) || !scale || scale.length === 0) {
    return null
  }
  const band = [...scale]
    .sort((a, b) => b.min_marks - a.min_marks)
    .find((b) => marks >= b.min_marks)
  return band
    ? { grade: band.grade, grade_point: band.grade_point, is_fail: band.is_fail }
    : null
}
