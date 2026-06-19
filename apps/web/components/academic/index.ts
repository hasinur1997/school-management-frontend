/**
 * Shared academic selectors (task 2.1) — the cached dropdown sources reused by
 * attendance, marks, promotion, fees, and reports. Import these rather than
 * rebuilding a class/section/subject/session picker per module.
 */

export { AcademicSelect } from "./academic-select"
export type {
  AcademicSelectOption,
  AcademicSelectProps,
} from "./academic-select"
export { SessionSelect } from "./session-select"
export { ClassSelect } from "./class-select"
export { SectionSelect } from "./section-select"
export { SubjectSelect } from "./subject-select"
