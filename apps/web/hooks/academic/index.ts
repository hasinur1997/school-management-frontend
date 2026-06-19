/**
 * Academic read hooks (task 2.1) — the single fetch layer behind the shared
 * academic selectors. Downstream modules (attendance, marks, promotion, fees,
 * reports) import these rather than re-querying the endpoints.
 */

export { useSessions } from "./use-sessions"
export { useClasses } from "./use-classes"
export { useSections } from "./use-sections"
export { useSubjects } from "./use-subjects"

/**
 * Write hooks (task 2.2) — create/update/delete for each academic entity. Each
 * invalidates the matching shared selector key above on success.
 */
export {
  useCreateSession,
  useUpdateSession,
  useDeleteSession,
  type SessionInput,
} from "./use-session-mutations"
export {
  useCreateClass,
  useUpdateClass,
  useDeleteClass,
  type ClassInput,
} from "./use-class-mutations"
export {
  useCreateSection,
  useUpdateSection,
  useDeleteSection,
  type SectionInput,
} from "./use-section-mutations"
export {
  useCreateSubject,
  useUpdateSubject,
  useDeleteSubject,
  type SubjectInput,
} from "./use-subject-mutations"

/**
 * Teacher assignments (task 2.3) — read + write. Writes invalidate the
 * `["teacher-assignments"]` key so the filtered lists stay consistent.
 */
export {
  useTeacherAssignments,
  type TeacherAssignmentFilters,
} from "./use-teacher-assignments"
export {
  useCreateTeacherAssignment,
  useUpdateTeacherAssignment,
  useDeleteTeacherAssignment,
  type TeacherAssignmentInput,
} from "./use-teacher-assignment-mutations"
