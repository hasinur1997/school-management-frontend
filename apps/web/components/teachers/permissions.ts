/**
 * Permissions that gate the teachers module (task 2.4).
 *
 * The contract `docs/api/teachers.md` is absent from the repo (see the progress
 * tracker), so the slugs follow the documented convention used across the app
 * (`<module>.view` / `<module>.manage`) and match the nav gate already in place
 * (`teachers.view`). `manage` covers create, edit, status, photo, and
 * resend-credentials. The API's `403` stays the real boundary — gating only
 * hides what the user can't do. Split these if the real contract is finer.
 */
export const TEACHER_VIEW = "teachers.view"
export const TEACHER_MANAGE = "teachers.manage"
/**
 * Gates the soft-delete trash lifecycle (move to trash, restore, permanent
 * delete). Matches the real backend slug `teacher.delete` (singular) seeded in
 * `~/Herd/app-api` `PermissionSeeder` and enforced on `routes/api/v1/teachers.php`.
 */
export const TEACHER_DELETE = "teacher.delete"
