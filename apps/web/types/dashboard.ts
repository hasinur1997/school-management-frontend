/**
 * Dashboard contract types (`GET /dashboard`, feature-spec 05).
 *
 * The endpoint returns a role- and branch-scoped bag of summary figures. The
 * exact set varies by who is asking (a teacher, an accountant, and a super
 * admin viewing consolidated data all see different figures), so the screen
 * renders **only the figures the response contains** and computes nothing
 * itself (ticket 1.7 Rules).
 *
 * The documented contract (`docs/api/settings.md`) is not yet in the repo, so
 * this models the flexible shape the spec describes: a flat object whose values
 * are scalar figures — counts as integers and money as `decimal(12,2)` strings.
 * Non-scalar/unknown entries are ignored by the renderer rather than assumed.
 */

/** A single summary figure value: a count (number) or money (decimal string). */
export type DashboardFigureValue = string | number | null

/** The unwrapped `data` of `GET /dashboard`: figure key → scalar value. */
export type DashboardSummary = Record<string, unknown>
