/**
 * Academic read hooks (task 2.1) — the single fetch layer behind the shared
 * academic selectors. Downstream modules (attendance, marks, promotion, fees,
 * reports) import these rather than re-querying the endpoints.
 */

export { useSessions } from "./use-sessions"
export { useClasses } from "./use-classes"
export { useSections } from "./use-sections"
export { useSubjects } from "./use-subjects"
