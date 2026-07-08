/**
 * Results contract (task 4.3), implemented against the live Laravel API:
 * `ResultController`, `AnnualResultController`, `ResultBundleResource`, and
 * `ExamResultResource`. Result math is server-owned; these types only describe
 * the returned figures and flags the UI displays.
 */

import type { PaginationMeta } from "./api"
import type { ExamType } from "./exam"
import type { GradingBand } from "./mark"

export interface ResultStudentSummary {
  id: string
  name_en: string | null
  admission_no: string | null
  father_name?: string | null
  mother_name?: string | null
  class: string | null
  section: string | null
  roll_no: string | number | null
}

export interface ResultSubject {
  name: string | null
  obtained_marks: string | number | null
  grade: string | null
  grade_point: string | number | null
}

export interface PerExamResult {
  type: ExamType
  published: boolean
  gpa: string | number | null
  grade: string | null
  is_passed: boolean
  /** Academic session year for the transcript title (e.g. "2016"). */
  year?: string | null
  /** "Held in the Month of …" label from the exam's date range. */
  held_in?: string | null
  subjects: ResultSubject[]
}

export interface AnnualResult {
  first_semester_gpa: string | number | null
  second_semester_gpa: string | number | null
  final_exam_gpa: string | number | null
  annual_gpa: string | number | null
  grade: string | null
  is_passed: boolean
  published: boolean
}

export interface ResultBundle {
  student: ResultStudentSummary
  exams: PerExamResult[]
  annual: AnnualResult | null
}

export interface ResultSearchParams {
  admission_no?: string
  session_id?: string | null
  class_id?: string | null
  section_id?: string | null
  roll_no?: string | number | null
  /** Screen-local branch filter (super admin); overrides the active branch. */
  branch_id?: string | null
}

export interface ExamResultRow {
  enrollment_id: string
  roll_no: string | number | null
  /** Student `public_id` for linking to the detail page's Results tab. */
  student_id?: string | null
  name_en: string | null
  total_marks: string | number | null
  gpa: string | number | null
  grade: string | null
  is_passed: boolean
}

export type ResultPassFilter = "all" | "passed" | "failed"

/**
 * Verdict aggregates the exam-results browse returns in `meta.summary`,
 * describing the whole class/section-scoped cohort regardless of the
 * `is_passed` filter. `gpa5` counts GPA-5.00 achievers.
 */
export interface ExamResultsSummary {
  examinee: number
  passed: number
  failed: number
  gpa5: number
}

export interface ExamResultsMeta extends PaginationMeta {
  summary?: ExamResultsSummary
}

export interface ExamResultsParams {
  exam_id?: string | null
  class_id?: string | null
  section_id?: string | null
  is_passed?: ResultPassFilter
  /** Screen-local branch filter (super admin); overrides the active branch. */
  branch_id?: string | null
  page?: number
  per_page?: number
}

export interface ResultGenerationSummary {
  generated: number
  skipped: Array<{
    enrollment_id: string | number
    missing_subjects?: string[]
    reason?: string
  }>
}

export interface ResultPublishSummary {
  published: number
}

export interface AnnualResultInput {
  session_id: string
  class_id: string
}

// ---------------------------------------------------------------------------
// Public result lookup (task 4.3.1)
// ---------------------------------------------------------------------------

export interface PublicResultLookupParams {
  roll_no: string
  branch_id: string
  class_id: string
  year: string
  semester: string
}

export interface PublicResultStudentInformation {
  roll_no: string | number | null
  student_name: string | null
  father_name: string | null
  mother_name: string | null
  class: string | null
  section: string | null
  session: string | null
  semester: string | null
  date_of_birth: string | null
  result: string | number | null
  /** "Held in the Month of …" label from the exam's date range. */
  held_in?: string | null
}

export interface PublicResultSubject {
  subject_code: string | null
  subject_name: string | null
  marks: string | number | null
  grade: string | null
  grade_point: string | number | null
}

export interface PublicResult {
  student_information: PublicResultStudentInformation | null
  subjects: PublicResultSubject[]
  /** Global grading scale, bundled so the public sheet can show the legend. */
  grading_scale?: GradingBand[]
}
