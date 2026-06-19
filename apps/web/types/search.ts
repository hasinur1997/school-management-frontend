/**
 * Global command-search contract types (task 1.6).
 *
 * The palette surfaces two kinds of hit: **modules** (navigable app sections,
 * derived from the sidebar model) and **records** (students, teachers, classes,
 * … pulled from each module's list/search endpoint). Both are normalized to a
 * single `SearchResult` so the `Command` panel can render them uniformly and
 * navigate on select. Every result is permission-filtered before it is built
 * (`code-standards.md`, Authorization) — the API stays authoritative on select.
 */

import type { LucideIcon } from "lucide-react"

/** A single navigable hit rendered in the command palette. */
export interface SearchResult {
  /** Stable key, unique across all groups (`"<group>:<id>"`). */
  key: string
  /** Group heading this result is listed under ("Students", "Modules", …). */
  group: string
  /** Primary label (record name / module title). */
  label: string
  /** Optional secondary line (class·section, designation, code…). */
  sublabel?: string
  /** Route the selection navigates to. */
  href: string
  /** Icon shown beside the result. */
  icon: LucideIcon
  /**
   * Free-text the palette matches against. Records are already server-filtered,
   * so this exists mainly so module hits can be filtered client-side and so
   * `Command`'s own value never collapses two distinct rows.
   */
  value: string
}

/**
 * The unwrapped shape of one record returned by a module's list/search
 * endpoint. The Laravel API replies inside the standard envelope; these are the
 * fields the palette reads, all optional so a missing column never crashes the
 * mapper (`code-standards.md`, States & Resilience). Each source maps its own
 * rows into `SearchResult`s.
 */
export interface SearchRecord {
  id: number | string
  name?: string | null
  full_name?: string | null
  title?: string | null
  /** Identifiers that commonly stand in for a sublabel. */
  roll_number?: string | null
  student_id?: string | null
  employee_id?: string | null
  designation?: string | null
  code?: string | null
  /** Academic context shown as a sublabel for student rows. */
  class_name?: string | null
  section_name?: string | null
}
