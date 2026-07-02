"use client"

/**
 * `useClassAttendanceMonth(...)` — assembles the class/section **monthly sheet**
 * (task 3.2) from the browse endpoint `GET /attendance`.
 *
 * The backend has no month-range filter (only an exact `date`), and the listing
 * is ordered `date desc`. So we page through the class/section's records,
 * keeping only those that fall inside the selected month, and stop as soon as a
 * page's oldest row predates the month (older pages can only be older still). A
 * page cap bounds the worst case; `truncated` is surfaced when it's hit.
 *
 * The result is a pure reshape of API rows into a student × day grid — no totals
 * are computed (`feature-specs/10`, Rules). The query stays disabled until a
 * class is chosen; the section filter is optional (omitted = whole class).
 */

import { useQuery } from "@tanstack/react-query"

import { useBranch } from "@/components/branch/branch-provider"
import { queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import type {
  AttendanceRecord,
  ClassAttendanceMonth,
  ClassAttendanceRow,
} from "@/types/attendance"
import { daysInMonth, isoDate } from "@/lib/attendance/month"

/** Per-page size for the browse listing (backend caps at 100). */
const PER_PAGE = 100

/** Safety cap so a request can never page unbounded over deep history. */
const MAX_PAGES = 60

interface ClassMonthArgs {
  classId: string | null
  sectionId: string | null
  year: number
  month: number
}

async function fetchClassMonth(
  classId: string,
  sectionId: string | null,
  year: number,
  month: number
): Promise<ClassAttendanceMonth> {
  const totalDays = daysInMonth(year, month)
  const monthStart = isoDate(year, month, 1)
  const monthEnd = isoDate(year, month, totalDays)

  const collected: AttendanceRecord[] = []
  let page = 1
  let lastPage = 1
  let truncated = false

  // Page through `date desc` records, collecting this month's and stopping once
  // we've scrolled past the month start.
  for (;;) {
    const { data, meta } = await requestPaginated<AttendanceRecord>(
      "/attendance",
      {
        params: {
          class_id: classId,
          // Section is optional: omitted, the sheet spans the whole class.
          ...(sectionId != null ? { section_id: sectionId } : {}),
          per_page: PER_PAGE,
          page,
        },
      }
    )
    lastPage = meta?.last_page ?? page

    for (const record of data) {
      if (record.date >= monthStart && record.date <= monthEnd) {
        collected.push(record)
      }
    }

    const oldestOnPage = data[data.length - 1]?.date
    // `YYYY-MM-DD` compares lexicographically; once the oldest row predates the
    // month, every later page is older — stop.
    if (oldestOnPage != null && oldestOnPage < monthStart) break
    if (page >= lastPage) break
    if (page >= MAX_PAGES) {
      truncated = true
      break
    }
    page += 1
  }

  return assembleGrid(collected, year, month, totalDays, truncated)
}

function assembleGrid(
  records: AttendanceRecord[],
  year: number,
  month: number,
  totalDays: number,
  truncated: boolean
): ClassAttendanceMonth {
  const byEnrollment = new Map<string, ClassAttendanceRow>()

  for (const record of records) {
    const enrollmentId = record.enrollment_id
    if (!enrollmentId) continue

    let row = byEnrollment.get(enrollmentId)
    if (!row) {
      row = {
        enrollment_id: enrollmentId,
        roll_no: record.roll_no ?? null,
        name_en: record.name_en ?? null,
        section: record.section ?? null,
        marks: {},
      }
      byEnrollment.set(enrollmentId, row)
    }
    row.marks[record.date] = record.status
  }

  const rows = [...byEnrollment.values()].sort(compareRows)
  const days = Array.from({ length: totalDays }, (_, index) => index + 1)

  return { month, year, days, rows, truncated }
}

/** Order rows by section, then roll number (numeric when possible), then name. */
function compareRows(a: ClassAttendanceRow, b: ClassAttendanceRow): number {
  const bySection = (a.section ?? "").localeCompare(b.section ?? "")
  if (bySection !== 0) return bySection

  const rollA = Number(a.roll_no)
  const rollB = Number(b.roll_no)
  const aNumeric = a.roll_no != null && !Number.isNaN(rollA)
  const bNumeric = b.roll_no != null && !Number.isNaN(rollB)

  if (aNumeric && bNumeric && rollA !== rollB) return rollA - rollB
  if (aNumeric !== bNumeric) return aNumeric ? -1 : 1

  return (a.name_en ?? "").localeCompare(b.name_en ?? "")
}

export function useClassAttendanceMonth({
  classId,
  sectionId,
  year,
  month,
}: ClassMonthArgs) {
  const { branchParam } = useBranch()
  // Section is optional — a class alone loads the whole class's sheet.
  const enabled = classId != null

  return useQuery({
    queryKey: queryKey("attendance", "class-month", {
      class_id: classId,
      section_id: sectionId,
      year,
      month,
      branch: branchParam,
    }),
    queryFn: () => fetchClassMonth(classId as string, sectionId, year, month),
    enabled,
    staleTime: STALE_TIME.SHORT,
  })
}
