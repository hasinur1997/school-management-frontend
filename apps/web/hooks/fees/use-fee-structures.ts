"use client"

/**
 * `useFeeStructures(params)` — reads the paginated fee-structure list
 * (`GET /fee-structures?session_id=&class_id=&fee_type=&page=&per_page=`,
 * task F-5.1), returning both the rows and the pagination `meta`.
 *
 * Filters and the page are folded into the query key (alongside the super-admin
 * `branch`) so each combination caches separately; only set filters are sent
 * (`all`/empty are dropped). `keepPreviousData` keeps the current page visible
 * while the next loads. Writes invalidate `["fee-structures"]`.
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { queryKey, requestPaginated, STALE_TIME } from "@/lib/api"
import { useBranch } from "@/components/branch/branch-provider"
import type { FeeStructure, FeeStructureListParams } from "@/types/fee"

export const FEE_STRUCTURES_PER_PAGE = 15

/** Drop empty/`all` filters so the request only carries active ones. */
function toParams(params: FeeStructureListParams) {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    per_page: params.per_page ?? FEE_STRUCTURES_PER_PAGE,
  }
  if (params.session_id) query.session_id = params.session_id
  if (params.class_id) query.class_id = params.class_id
  if (params.fee_type && params.fee_type !== "all") {
    query.fee_type = params.fee_type
  }
  // Explicit screen-local branch filter; wins over the active branch in the
  // request interceptor.
  if (params.branch_id) query.branch_id = params.branch_id
  return query
}

export function useFeeStructures(
  params: FeeStructureListParams,
  enabled = true,
) {
  const { branchParam } = useBranch()
  const query = toParams(params)

  return useQuery({
    queryKey: queryKey("fee-structures", "list", {
      ...query,
      branch: params.branch_id ?? branchParam,
    }),
    queryFn: () =>
      requestPaginated<FeeStructure>("/fee-structures", { params: query }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.STANDARD,
  })
}
