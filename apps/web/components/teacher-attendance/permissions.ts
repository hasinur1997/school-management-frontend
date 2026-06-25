/**
 * Teacher-attendance permission slugs from the real backend routes
 * (`routes/api/v1/attendance.php`). `teacher_attendance.view` gates the admin
 * browse listing; `teacher_attendance.manage` gates single-record corrections.
 * The self check-in/out endpoints are role-gated (`role:teacher`) rather than
 * permission-gated — teachers hold no permissions by design.
 */
export const TEACHER_ATTENDANCE_VIEW = "teacher_attendance.view"
export const TEACHER_ATTENDANCE_MANAGE = "teacher_attendance.manage"
