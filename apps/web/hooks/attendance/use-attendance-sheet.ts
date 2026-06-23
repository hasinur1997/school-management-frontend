"use client"

/**
 * `useAttendanceSheet(params)` — reads `GET /attendance/sheet`, the roster
 * entry source for a class/section/date. The query stays disabled until all
 * three selectors are filled, so the screen can render a purposeful setup state.
 */

import { useQuery } from "@tanstack/react-query"

import { useBranch } from "@/components/branch/branch-provider"
import { api, queryKey, STALE_TIME } from "@/lib/api"
import type { AttendanceSheet, AttendanceSheetParams } from "@/types/attendance"

function toParams(params: AttendanceSheetParams) {
  const query: Record<string, string | number> = {}
  if (params.class_id != null) query.class_id = params.class_id
  if (params.section_id != null) query.section_id = params.section_id
  if (params.date) query.date = params.date
  return query
}

export function useAttendanceSheet(params: AttendanceSheetParams) {
  const { branchParam } = useBranch()
  const query = toParams(params)
  const enabled =
    params.class_id != null && params.section_id != null && Boolean(params.date)

  return useQuery({
    queryKey: queryKey("attendance", "sheet", {
      ...query,
      branch: branchParam,
    }),
    queryFn: () =>
      api.get<AttendanceSheet>("/attendance/sheet", { params: query }),
    enabled,
    staleTime: STALE_TIME.SHORT,
  })
}
