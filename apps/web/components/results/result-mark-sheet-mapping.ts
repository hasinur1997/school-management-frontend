/**
 * Shared adapter from a per-exam result into the academic-transcript mark-sheet
 * paper props. Both the Results tab (on-screen sheet) and the Marksheet tab
 * (select-a-semester → generate) build their sheets through this one mapper so
 * the layout, title, and field order stay identical across the two surfaces.
 */

import { EXAM_TYPE_LABELS } from "@/types/exam"
import type { GradingBand } from "@/types/mark"
import type { PerExamResult, ResultStudentSummary } from "@/types/result"
import type {
  MarkSheetField,
  ResultMarkSheetPaperProps,
} from "./result-mark-sheet-paper"

/** Adapt one per-exam result + its student into the mark-sheet paper props. */
export function examToMarkSheetProps(
  result: PerExamResult,
  student: ResultStudentSummary,
  scale: GradingBand[] | undefined
): ResultMarkSheetPaperProps {
  const label = EXAM_TYPE_LABELS[result.type] ?? result.type
  const fields: MarkSheetField[] = [
    { label: "Student Name", value: student.name_en },
    { label: "Father's Name", value: student.father_name },
    { label: "Mother's Name", value: student.mother_name },
    { label: "Admission No", value: student.admission_no, mono: true },
    { label: "Class", value: student.class },
    { label: "Section", value: student.section },
    { label: "Roll No", value: student.roll_no, mono: true },
    { label: "Examination", value: label },
  ]
  const subjects = result.subjects.map((subject) => ({
    name: subject.name,
    marks: subject.obtained_marks,
    grade: subject.grade,
    point: subject.grade_point,
  }))

  // "Second Semester Examination, 2016" when the session year is known, else a
  // plain "… Result" heading. The paper drops the year from the month line when
  // the title already carries it, so it never prints twice.
  const title = result.year
    ? `${label} Examination, ${result.year}`
    : `${label} Result`

  return {
    title,
    examMonth: result.held_in,
    fields,
    scale,
    subjects,
    gpa: result.gpa,
    grade: result.grade,
  }
}
