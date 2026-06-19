"use client"

/**
 * Record sources for the global command search (task 1.6).
 *
 * Each source maps one module's list/search endpoint to normalized
 * `SearchResult`s. The endpoints follow the standard Laravel list contract
 * (`?search=&per_page=`, envelope `data` array); classes are read whole and
 * filtered client-side because that endpoint is an unpaginated dropdown source
 * (`feature-specs/06-academic-structure.md`). Every source declares the
 * **permission** it requires so the hook can skip sources the user can't access
 * — never gated on role names (`code-standards.md`, Authorization).
 *
 * Backend contract docs (`docs/api/*.md`) are absent from this repo (see the
 * progress tracker's auth note); these endpoints/field names follow the
 * documented conventions and are listed as assumptions in the tracker. Field
 * reads are defensive so a differing shape yields no row rather than a crash.
 */

import { BookOpen, GraduationCap, Users, type LucideIcon } from "lucide-react"

import { api } from "@/lib/api"
import type { SearchRecord, SearchResult } from "@/types/search"

/** Max rows surfaced per record group, keeping the panel scannable. */
export const RESULT_LIMIT = 5

/** Minimum query length before record endpoints are queried. */
export const MIN_QUERY_LENGTH = 2

export interface RecordSource {
  /** Identity used in the query key and as the result-key prefix. */
  module: string
  /** Group heading shown in the palette. */
  group: string
  /** Permission required to query/show this source. */
  permission: string
  icon: LucideIcon
  /** Run the search and return normalized results (already capped). */
  fetch: (query: string) => Promise<SearchResult[]>
}

/** Join non-empty parts into a sublabel, or `undefined` when nothing remains. */
function sublabelFrom(
  parts: Array<string | null | undefined>
): string | undefined {
  const joined = parts
    .filter((p): p is string => Boolean(p && p.trim()))
    .join(" · ")
  return joined || undefined
}

/** Query a paginated list endpoint with the standard `search`/`per_page` params. */
async function fetchList(
  endpoint: string,
  query: string
): Promise<SearchRecord[]> {
  const rows = await api.get<SearchRecord[]>(endpoint, {
    params: { search: query, per_page: RESULT_LIMIT },
  })
  return Array.isArray(rows) ? rows.slice(0, RESULT_LIMIT) : []
}

export const RECORD_SOURCES: RecordSource[] = [
  {
    module: "students",
    group: "Students",
    permission: "students.view",
    icon: GraduationCap,
    fetch: async (query) => {
      const rows = await fetchList("/students", query)
      return rows.map((r) => {
        const label = r.full_name ?? r.name ?? `Student #${r.id}`
        const sublabel = sublabelFrom([
          sublabelFrom([r.class_name, r.section_name]),
          r.roll_number ? `Roll ${r.roll_number}` : r.student_id,
        ])
        return {
          key: `students:${r.id}`,
          group: "Students",
          label,
          sublabel,
          href: `/students/${r.id}`,
          icon: GraduationCap,
          value: `students ${label} ${sublabel ?? ""}`,
        }
      })
    },
  },
  {
    module: "teachers",
    group: "Teachers",
    permission: "teachers.view",
    icon: Users,
    fetch: async (query) => {
      const rows = await fetchList("/teachers", query)
      return rows.map((r) => {
        const label = r.full_name ?? r.name ?? `Teacher #${r.id}`
        const sublabel = sublabelFrom([r.designation, r.employee_id])
        return {
          key: `teachers:${r.id}`,
          group: "Teachers",
          label,
          sublabel,
          href: `/teachers/${r.id}`,
          icon: Users,
          value: `teachers ${label} ${sublabel ?? ""}`,
        }
      })
    },
  },
  {
    module: "classes",
    group: "Classes",
    permission: "academic.view",
    icon: BookOpen,
    // The classes endpoint is an unpaginated dropdown source, so it is read
    // whole and filtered locally against the query.
    fetch: async (query) => {
      const rows = await api.get<SearchRecord[]>("/classes")
      const q = query.toLowerCase()
      return (Array.isArray(rows) ? rows : [])
        .filter((r) => {
          const name = (r.name ?? r.title ?? "").toLowerCase()
          return name.includes(q)
        })
        .slice(0, RESULT_LIMIT)
        .map((r) => {
          const label = r.name ?? r.title ?? `Class #${r.id}`
          return {
            key: `classes:${r.id}`,
            group: "Classes",
            label,
            sublabel: r.code ?? undefined,
            href: `/academic?class=${r.id}`,
            icon: BookOpen,
            value: `classes ${label}`,
          }
        })
    },
  },
]
