/**
 * Teacher attendance data layer (task 3.3). Components import from here so the
 * module has one fetch/mutation surface.
 */

export {
  useMyTeacherAttendance,
  useCheckIn,
  useCheckOut,
} from "./use-my-teacher-attendance"
export {
  useTeacherAttendanceList,
  TEACHER_ATTENDANCE_PER_PAGE,
} from "./use-teacher-attendance"
export { useCorrectTeacherAttendance } from "./use-teacher-attendance-mutations"
