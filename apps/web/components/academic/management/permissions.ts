/**
 * Permission that gates academic-structure writes (task 2.2).
 *
 * The contract `docs/api/academic-structure.md` is absent from the repo (see the
 * progress tracker), so the exact write-permission slug is an assumption: a
 * single `academic.manage` gates create/edit/delete across sessions, classes,
 * sections, and subjects. Reads stay open to all authenticated users
 * (`feature-specs/06-academic-structure.md`). The API's `403` remains the real
 * boundary — gating only hides actions the user can't perform. Adjust this slug
 * (or split it per entity) when the real contract lands.
 */
export const ACADEMIC_MANAGE = "academic.manage"

/**
 * Permission that gates teacher-assignment writes (task 2.3). The contract is
 * still absent, so this is an assumption: assignments are part of the academic
 * structure (`feature-specs/06-academic-structure.md`), so create/edit/delete
 * reuse the same `academic.manage` slug. Split this out if the real contract
 * documents a distinct assignment permission. The API's `403` stays the real
 * boundary.
 */
export const ASSIGNMENT_MANAGE = "academic.manage"
