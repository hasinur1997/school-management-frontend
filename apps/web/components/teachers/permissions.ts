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
