"use client"

/**
 * Results data hooks (task 4.3). Query keys include every filter and active
 * branch context; mutations invalidate results plus exams where publish changes
 * exam status. The API owns all result computation and publication guards.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useBranch } from "@/components/branch/branch-provider"
import { api, queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import type {
  AnnualResultInput,
  ExamResultRow,
  ExamResultsParams,
  ResultBundle,
  ResultGenerationSummary,
  ResultPassFilter,
  ResultPublishSummary,
  ResultSearchParams,
} from "@/types/result"

export const RESULTS_PER_PAGE = 15

function cleanSearchParams(params: ResultSearchParams) {
  const query: Record<string, string | number> = {}
  if (params.admission_no?.trim()) query.admission_no = params.admission_no.trim()
  if (params.session_id) query.session_id = params.session_id
  if (params.class_id) query.class_id = params.class_id
  if (params.section_id) query.section_id = params.section_id
  if (params.roll_no != null && String(params.roll_no).trim()) {
    query.roll_no = String(params.roll_no).trim()
  }
  return query
}

function passFilterValue(filter: ResultPassFilter | undefined) {
  if (filter === "passed") return 1
  if (filter === "failed") return 0
  return undefined
}

function cleanExamResultParams(params: ExamResultsParams) {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    per_page: params.per_page ?? RESULTS_PER_PAGE,
  }
  if (params.section_id) query.section_id = params.section_id
  const isPassed = passFilterValue(params.is_passed)
  if (isPassed !== undefined) query.is_passed = isPassed
  return query
}

export function useResultSearch(params: ResultSearchParams, enabled: boolean) {
  const { branchParam } = useBranch()
  const query = cleanSearchParams(params)

  return useQuery({
    queryKey: queryKey("results", "search", { ...query, branch: branchParam }),
    queryFn: () => api.get<ResultBundle>("/results/search", { params: query }),
    enabled: enabled && Object.keys(query).length > 0,
    retry: false,
    staleTime: STALE_TIME.STANDARD,
  })
}

export function useEnrollmentResults(
  enrollmentId: string | null | undefined,
  enabled = true
) {
  const { branchParam } = useBranch()

  return useQuery({
    queryKey: queryKey("results", "enrollment", {
      enrollment_id: enrollmentId,
      branch: branchParam,
    }),
    queryFn: () => api.get<ResultBundle>(`/enrollments/${enrollmentId}/results`),
    enabled: enabled && Boolean(enrollmentId),
    retry: false,
    staleTime: STALE_TIME.STANDARD,
  })
}

export function useMyResults(params: {
  student_id?: string | null
  session_id?: string | null
}) {
  const query: Record<string, string> = {}
  if (params.student_id) query.student_id = params.student_id
  if (params.session_id) query.session_id = params.session_id

  return useQuery({
    queryKey: queryKey("results", "me", query),
    queryFn: () => api.get<ResultBundle>("/me/results", { params: query }),
    retry: false,
    staleTime: STALE_TIME.STANDARD,
  })
}

export function useExamResults(params: ExamResultsParams, enabled: boolean) {
  const { branchParam } = useBranch()
  const query = cleanExamResultParams(params)

  return useQuery({
    queryKey: queryKey("results", "exam-list", {
      exam_id: params.exam_id,
      ...query,
      branch: branchParam,
    }),
    queryFn: () =>
      requestPaginated<ExamResultRow>(`/exams/${params.exam_id}/results`, {
        params: query,
      }),
    enabled: enabled && Boolean(params.exam_id),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.STANDARD,
  })
}

function useInvalidateResults() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["results"] })
    void queryClient.invalidateQueries({ queryKey: ["exams"] })
  }
}

export function useGenerateExamResults() {
  const invalidate = useInvalidateResults()
  return useMutation({
    mutationFn: (examId: string) =>
      api.post<ResultGenerationSummary>(`/exams/${examId}/results/generate`, {}),
    onSuccess: invalidate,
  })
}

export function usePublishExamResults() {
  const invalidate = useInvalidateResults()
  return useMutation({
    mutationFn: (examId: string) =>
      api.post<ResultPublishSummary>(`/exams/${examId}/results/publish`, {}),
    onSuccess: invalidate,
  })
}

export function useGenerateAnnualResults() {
  const invalidate = useInvalidateResults()
  return useMutation({
    mutationFn: (input: AnnualResultInput) =>
      api.post<ResultGenerationSummary>("/annual-results/generate", input),
    onSuccess: invalidate,
  })
}

export function usePublishAnnualResults() {
  const invalidate = useInvalidateResults()
  return useMutation({
    mutationFn: (input: AnnualResultInput) =>
      api.post<ResultPublishSummary>("/annual-results/publish", input),
    onSuccess: invalidate,
  })
}
