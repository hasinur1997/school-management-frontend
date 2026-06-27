/**
 * Permissions that gate the students module (task 2.7).
 *
 * Slugs match the real backend (`~/Herd/app-api` `routes/api/v1/students.php` +
 * `PermissionSeeder`): `student.view` gates the list, `student.create` gates the
 * direct-create endpoint (`POST /students`), `student.update` gates profile
 * update / status flip / photo upload, and `student.delete` gates the soft-delete
 * trash lifecycle. The profile/enrollments reads are policy-gated server-side
 * (staff, the student itself, or a linked parent), so the API's `404` stays the
 * real boundary; gating only hides what the user can't do.
 */
export const STUDENT_VIEW = "student.view"
export const STUDENT_CREATE = "student.create"
export const STUDENT_UPDATE = "student.update"
export const STUDENT_DELETE = "student.delete"
