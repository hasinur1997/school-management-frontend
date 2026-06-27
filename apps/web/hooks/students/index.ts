/**
 * Students data layer (task 2.7) — list + detail + enrollment reads and the
 * write mutations. Components import from here so there's a single fetch surface
 * per module.
 */

export { useStudents, STUDENTS_PER_PAGE } from "./use-students"
export { useTrashedStudents } from "./use-trashed-students"
export { useStudent } from "./use-student"
export { useStudentEnrollments } from "./use-student-enrollments"
export {
  useCreateStudent,
  useUpdateStudent,
  useUpdateEnrollment,
  useUpdateStudentStatus,
  useUploadStudentPhoto,
  useResendStudentCredentials,
  useDeleteStudent,
  useBulkDeleteStudents,
  useRestoreStudent,
  useBulkRestoreStudents,
  useForceDeleteStudent,
  useBulkForceDeleteStudents,
} from "./use-student-mutations"
