/**
 * Teachers data layer (task 2.4) — list + detail reads and the write mutations.
 * Components import from here so there's a single fetch surface per module.
 */

export { useTeachers, TEACHERS_PER_PAGE } from "./use-teachers"
export { useTeacher } from "./use-teacher"
export { useTeacherOptions } from "./use-teacher-options"
export {
  useCreateTeacher,
  useUpdateTeacher,
  useToggleTeacherStatus,
  useUploadTeacherPhoto,
  useDeleteTeacherPhoto,
  useResendTeacherCredentials,
} from "./use-teacher-mutations"
