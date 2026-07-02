/**
 * Results contract (task 4.3), implemented against the live Laravel API:
 * `ResultController`, `AnnualResultController`, `ResultBundleResource`, and
 * `ExamResultResource`. Result math is server-owned; these types only describe
 * the returned figures and flags the UI displays.
 */

import type { ExamType } from "./exam"

export interface ResultStudentSummary {
  id: string
  name_en: string | null
  admission_no: string | null
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
}

export interface ExamResultRow {
  enrollment_id: string
  roll_no: string | number | null
  name_en: string | null
  total_marks: string | number | null
  gpa: string | number | null
  grade: string | null
  is_passed: boolean
}

export type ResultPassFilter = "all" | "passed" | "failed"

export interface ExamResultsParams {
  exam_id?: string | null
  section_id?: string | null
  is_passed?: ResultPassFilter
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
}

export interface PublicResultSubject {
  subject_code: string | null
  subject_name: string | null
  marks: string | number | null
  grade: string | null
}

export interface PublicResult {
  student_information: PublicResultStudentInformation | null
  subjects: PublicResultSubject[]
}
