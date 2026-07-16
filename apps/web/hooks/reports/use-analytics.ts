"use client"

/**
 * Read hooks for the Reports dashboard tabs (imported "Reports" design). Every
 * tab shares one filter contract, folded (with the super-admin active branch)
 * into the query key so each combination caches separately; `keepPreviousData`
 * keeps the current figures on screen while a new filter loads. All aggregation
 * is server-side — these hooks only fetch and cache.
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { api, queryKey, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type {
  AdmissionsReport,
  AnalyticsQuery,
  AttendanceMode,
  AttendanceReport,
  ExamsReport,
  ExpensesReport,
  FeesCollectionReport,
  OverviewReport,
} from "@/types/analytics"

/** Translate an `AnalyticsQuery` into request params (public ids as-is; the API resolves them). */
export function toAnalyticsParams(
  query: AnalyticsQuery,
  extra: Record<string, string> = {}
): Record<string, string> {
  const params: Record<string, string> = { from: query.from, to: query.to }
  if (query.sessionId) params.session_id = query.sessionId
  if (query.classId) params.class_id = query.classId
  if (query.paymentStatus && query.paymentStatus !== "all") {
    params.payment_status = query.paymentStatus
  }
  if (query.branchId) params.branch_id = query.branchId
  return { ...params, ...extra }
}

/** Shared reader for a tab, keyed on the resolved filter + effective branch. */
function useAnalytics<T>(
  tab: string,
  query: AnalyticsQuery,
  extra: Record<string, string> = {},
  enabled = true
) {
  const { branchParam } = useBranch()
  const params = toAnalyticsParams(query, extra)

  return useQuery({
    queryKey: queryKey("reports", `analytics:${tab}`, {
      ...params,
      branch: query.branchId ?? branchParam,
    }),
    queryFn: ({ signal }) =>
      api.get<T>(`/reports/analytics/${tab}`, { params, signal }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.STANDARD,
  })
}

export const useOverviewReport = (query: AnalyticsQuery, enabled = true) =>
  useAnalytics<OverviewReport>("overview", query, {}, enabled)

export const useFeesCollectionReport = (query: AnalyticsQuery, enabled = true) =>
  useAnalytics<FeesCollectionReport>("fees", query, {}, enabled)

export const useAttendanceReport = (
  query: AnalyticsQuery,
  mode: AttendanceMode,
  enabled = true
) => useAnalytics<AttendanceReport>("attendance", query, { mode }, enabled)

export const useExamsReport = (
  query: AnalyticsQuery,
  examType: string | null,
  enabled = true
) =>
  useAnalytics<ExamsReport>(
    "exams",
    query,
    examType ? { exam_type: examType } : {},
    enabled
  )

export const useAdmissionsReport = (query: AnalyticsQuery, enabled = true) =>
  useAnalytics<AdmissionsReport>("admissions", query, {}, enabled)

export const useExpensesReport = (query: AnalyticsQuery, enabled = true) =>
  useAnalytics<ExpensesReport>("expenses", query, {}, enabled)
