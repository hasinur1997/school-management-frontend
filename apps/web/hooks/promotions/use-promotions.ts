"use client"

/**
 * Promotion data hooks (task 4.5). The preview read and the history list fold
 * every filter plus the active branch into their query keys; the bulk and
 * individual mutations invalidate promotions (preview + history) and the
 * student/result caches, since a promotion closes an enrollment and opens a new
 * one in the target class/session.
 *
 * Eligibility and the next class are server-owned — these hooks only carry the
 * chosen scope to the API and hand back the returned figures.
 */

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { useBranch } from "@/components/branch/branch-provider"
import { api, queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import type {
  PromotionBulkInput,
  PromotionBulkSummary,
  PromotionHistoryParams,
  PromotionIndividualInput,
  PromotionMoveResult,
  PromotionPreview,
  PromotionPreviewParams,
  PromotionRun,
} from "@/types/promotion"

export const PROMOTIONS_PER_PAGE = 15

function cleanPreviewParams(params: PromotionPreviewParams) {
  const query: Record<string, string> = {}
  if (params.session_id) query.session_id = params.session_id
  if (params.class_id) query.class_id = params.class_id
  // Screen-local branch filter; wins over the active branch in the interceptor.
  if (params.branch_id) query.branch_id = params.branch_id
  return query
}

/** Guard a returned student array into a defaulted list. */
function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

/** Normalize the preview so the screen always reads defaulted arrays. */
function normalizePreview(data: PromotionPreview): PromotionPreview {
  return {
    to_class: data?.to_class ?? null,
    eligible: asArray(data?.eligible),
    not_eligible: asArray(data?.not_eligible),
  }
}

export function usePromotionPreview(
  params: PromotionPreviewParams,
  enabled: boolean
) {
  const { branchParam } = useBranch()
  const query = cleanPreviewParams(params)
  const ready = Boolean(query.session_id && query.class_id)

  return useQuery({
    queryKey: queryKey("promotions", "preview", {
      ...query,
      branch: params.branch_id ?? branchParam,
    }),
    queryFn: () =>
      api.get<PromotionPreview>("/promotions/preview", { params: query }),
    enabled: enabled && ready,
    retry: false,
    staleTime: STALE_TIME.STANDARD,
    select: normalizePreview,
  })
}

export function usePromotionHistory(
  params: PromotionHistoryParams,
  enabled = true
) {
  const { branchParam } = useBranch()
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    per_page: params.per_page ?? PROMOTIONS_PER_PAGE,
  }
  if (params.session_id) query.session_id = params.session_id
  if (params.class_id) query.class_id = params.class_id
  if (params.type && params.type !== "all") query.type = params.type

  return useQuery({
    queryKey: queryKey("promotions", "history", {
      ...query,
      branch: branchParam,
    }),
    queryFn: () =>
      requestPaginated<PromotionRun>("/promotions", { params: query }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.STANDARD,
  })
}

function useInvalidatePromotions() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["promotions"] })
    // A promotion re-enrolls students in the next class, so their lists and
    // result bundles change too.
    void queryClient.invalidateQueries({ queryKey: ["students"] })
    void queryClient.invalidateQueries({ queryKey: ["results"] })
  }
}

export function usePromoteBulk() {
  const invalidate = useInvalidatePromotions()
  return useMutation({
    mutationFn: (input: PromotionBulkInput) =>
      api.post<PromotionBulkSummary>("/promotions/bulk", input),
    onSuccess: invalidate,
  })
}

export function usePromoteIndividual() {
  const invalidate = useInvalidatePromotions()
  return useMutation({
    mutationFn: (input: PromotionIndividualInput) =>
      api.post<PromotionMoveResult>("/promotions/individual", input),
    onSuccess: invalidate,
  })
}
