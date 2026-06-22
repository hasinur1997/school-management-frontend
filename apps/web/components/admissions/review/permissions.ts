/**
 * Permissions that gate the admissions review module (task 2.6).
 *
 * The contract `docs/api/admissions.md` is absent (see the progress tracker), so
 * the slugs follow the documented convention (`<module>.view` / `<module>.manage`)
 * and match the nav gate already in place (`admissions.view`). `manage` covers
 * approve and reject. The API's `403` stays the real boundary — gating only hides
 * what the user can't do; super admins see all branches via the shell switcher.
 */
export const ADMISSION_VIEW = "admissions.view"
export const ADMISSION_MANAGE = "admissions.manage"
