/**
 * Student attendance data layer (tasks 3.1–3.2). Components import from here so
 * the module has one fetch/mutation surface.
 */

export { useAttendanceSheet } from "./use-attendance-sheet"
export {
  useSaveAttendance,
  useUpdateAttendanceRecord,
} from "./use-attendance-mutations"
export { useClassAttendanceMonth } from "./use-class-attendance"
export {
  useStudentMonthlyAttendance,
  useMyMonthlyAttendance,
} from "./use-monthly-attendance"
